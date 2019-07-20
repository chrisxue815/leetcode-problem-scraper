const fs = require('fs');
const https = require('https');

const allJsonPath = 'build/all.json';

class Scraper {
    async main() {
        let f = fs.createWriteStream(allJsonPath);

        let req = https.request('https://leetcode.com/api/problems/all/', res => {
            res.pipe(f);
            res.on('end', () => this.fetchAllQuestions());
        });

        req.end();
    }

    async fetchAllQuestions() {
        let all = await fs.promises.readFile(allJsonPath);
        this.all = JSON.parse(all);

        let questionRequest = await fs.promises.readFile('res/question-request.json');
        this.questionRequest = JSON.parse(questionRequest);

        this.index = -1;

        await this.fetchQuestion();
    }

    async fetchQuestion() {
        this.index++;

        if (this.index >= this.all.stat_status_pairs.length) {
            return;
        }

        let {question, outputPath} = await this.findNextQuestion();
        let slug = question.stat.question__title_slug;

        let headers = this.questionRequest.headers;
        let body = this.questionRequest.body.replace('{0}', slug);
        headers['Content-Length'] = body.length;

        let options = {
            method: 'POST',
            headers: this.questionRequest.headers,
        };

        let f = fs.createWriteStream(outputPath);

        let req = https.request('https://leetcode.com/graphql', options, res => {
            res.pipe(f);
            res.on('end', () => setTimeout(() => this.fetchQuestion(), 2000));
            res.on('error', err => console.error(err));
        });

        req.end(body);
    }

    async findNextQuestion() {
        for (; ; this.index++) {
            let question = this.all.stat_status_pairs[this.index];
            if (question.paid_only) {
                continue;
            }

            let id = question.stat.frontend_question_id;
            let outputPath = `build/questions/${id}.json`;

            try {
                await fs.promises.stat(outputPath);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    return {question, outputPath};
                }
            }
        }
    }
}

new Scraper().main();
