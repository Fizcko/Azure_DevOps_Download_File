const assert = require('assert');
const path = require('path');
const ttm = require('azure-pipelines-task-lib/mock-test');

describe('azure-devops-download-a-file', function () {
    it("downloadFile", (done) => {

        var tp = path.join(__dirname, "downloadFile.js");
        var tr = new ttm.MockTestRunner(tp);

        var conf = require(path.join(__dirname, 'conf.json'));
        process.env["AUTH"] = conf.download_file.auth_type;

        tr.run();
        
        try {
            assert(tr.succeeded, "Should have succeeded");
            done();
        }
        catch (error) {
            console.log("STDERR", tr.stderr);
            console.log("STDOUT", tr.stdout);
            done(error);
        }
    }).timeout(90000);
});
