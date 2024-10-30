const assert = require('assert');
const path = require('path');
const ttm = require('azure-pipelines-task-lib/mock-test');

describe('azure-devops-download-a-file', function () {
    it("downloadFile", async () => {

        var tp = path.join(__dirname, "downloadFile.js");
        var tr = new ttm.MockTestRunner(tp);

        var conf = require(path.join(__dirname, 'conf.json'));
        process.env["AUTH"] = conf.download_file.auth_type;

        await tr.runAsync(conf.task_node_version);
        
        try {
            assert(tr.succeeded, "Should have succeeded");
            console.log("STDOUT", tr.stdout);
        }
        catch (error) {
            console.log("STDERR", tr.stderr);
            console.log("STDOUT", tr.stdout);
        }
    }).timeout(90000);
});
