import tl = require('vsts-task-lib/task');
const url = require('url');
const http = require('http');
const https = require("https");
const path = require('path');
const fs = require('fs');
const Stream = require('stream').Transform;
const mkdirp = require('mkdirp');

async function run() {
	
	try {

		tl.setResourcePath(path.join(__dirname, 'task.json'));

		var strUrl = tl.getInput('strUrl', true);
		var strTargetDir = tl.getInput('strTargetDir', true);
		var strTargetFilename = tl.getInput('strTargetFilename', true);
		var authType = tl.getInput('authType', true);
		var basicAuthUsername = tl.getInput('basicAuthUsername', false);
		var basicAuthPassword = tl.getInput('basicAuthPassword', false);
		var bearerToken = tl.getInput('bearerToken', false);
		var ignoreCertificateChecks = tl.getBoolInput('ignoreCertificateChecks', true);
		var catchResponse = tl.getBoolInput('catchResponse', true);

		var output = path.join(strTargetDir,strTargetFilename)

		console.log("[INFO] Download url : '" + strUrl + "'");
		console.log("[INFO] Target output file : '" + output + "'");

		// Create target folder if he doesn't exist
		if(!fs.existsSync(strTargetDir)){
			mkdirp(strTargetDir, function (err) {
				if(err){
					throw new Error("Error when creating target folder. " + err);
				}
				else{
					console.log("[INFO] Creating target folder : '" + strTargetDir + "'");
				}
			});
		}

		// Setup options for the request
		var protocol;
		var options = url.parse(strUrl);

		// Set protocol and port in needed
		switch(options.protocol){
			case "https:":
				protocol = https;
				if(!options.port){
					options.port = 443;
				}
				if(ignoreCertificateChecks){
					console.log("[INFO] Ignore certificate checks : 'True'");
					options.rejectUnhauthorized = false;
					process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
				}
				else{
					console.log("[INFO] Ignore certificate checks : 'False'");
				}
				break;
			case "http:":
				protocol = http;
				if(!options.port){
					options.port = 80;
				}
				break;
			default:
				throw new Error("Protocol not supported. HTTP or HTTPS are supported.");
		}

		// Set authentification if needed
		switch(authType){
			case "basic":
				console.log("[INFO] Authentification type : 'Basic Auth'");
				console.log("[INFO] Username : '" + basicAuthUsername + "'");
				console.log("[INFO] Password : '" + basicAuthPassword + "'");
				options.headers = {
					'Authorization': 'Basic ' + new Buffer(basicAuthUsername + ':' + basicAuthPassword).toString('base64')
				}
				break;
			case "bearer":
				console.log("[INFO] Authentification type : 'Bearer Token'");
				console.log("[INFO] Token : '" + bearerToken + "'");
				options.headers = {
					'Authorization': 'Bearer ' + bearerToken
				}
				break;
			case "noAuth":
			default:
				console.log("[INFO] Authentification type : 'No Auth'");
				break;
		}
		
		console.log("[INFO] Starting downloading ...");
		var req = protocol.request(options, (res) => {

			var binaryData = new Stream();
			
			var statusCode = res.statusCode;
			
			res.on('data', function (d) {
				binaryData.push(d);
			});
			
			res.on('end', function (e) {

				var content = binaryData.read();

				if(catchResponse){
					if(parseInt(statusCode) < 200 || parseInt(statusCode) > 299){
						throw new Error("Error when download file [" + statusCode + "] : " + content);
					}
				}

				fs.writeFileSync(output, content);

				const targetFileInfos = fs.statSync(output);
				const fileSizeInBytes = targetFileInfos.size;
				console.log("[INFO] Download results :");
				console.log("[INFO] Status code : '" + statusCode + "'");
				console.log("[INFO] File infos : " + output + " (" + displayFileSize(fileSizeInBytes) + ")");
			});
			
			req.on('error', function catchError(error) {
				throw new Error("Error when download file [" + statusCode + "] : " + error);
			});
			
		});
		
		req.end();
		
		tl.setResult(tl.TaskResult.Succeeded, "Wrapping successfull.");

	} catch (err) {
		tl.setResult(tl.TaskResult.Failed, err);
	}
	
}

function displayFileSize(bytes : any){

	if(bytes == 0){
		return "0 Byte";
	}
	else{
		var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		var i = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
	}

}

run();