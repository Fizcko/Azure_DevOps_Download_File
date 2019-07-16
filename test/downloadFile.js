const tmrm = require('azure-pipelines-task-lib/mock-run');
const path = require('path');

var taskPath = path.join(__dirname, '..', 'myscripts/downloadFile.js');
var conf = require(path.join(__dirname, 'conf.json'));

var tr = new tmrm.TaskMockRunner(taskPath);

tr.setInput("strUrl", conf.download_file.strUrl);
tr.setInput("strTargetDir", conf.download_file.strTargetDir);
tr.setInput("strTargetFilename", conf.download_file.strTargetFilename);
tr.setInput("ignoreCertificateChecks", conf.download_file.ignore_ssl);
tr.setInput("catchResponse", conf.download_file.catch_response);

var strAuthType = process.env["AUTH"];

switch(strAuthType){			
    case "basic":
        tr.setInput("authType", "basic");
        tr.setInput("basicAuthUsername", conf.auth.basic.basicAuthUsername);
        tr.setInput("basicAuthPassword", conf.auth.basic.basicAuthPassword);
        break;
    case "bearer":
        tr.setInput("authType", "bearer");
        tr.setInput("bearerToken", conf.auth.bearer.bearerToken);
        break;
    case "noAuth":
        tr.setInput("authType", "noAuth");
        break;
}

tr.registerMock('azure-pipelines-task-lib/toolrunner', require('azure-pipelines-task-lib/mock-toolrunner'));
tr.run();