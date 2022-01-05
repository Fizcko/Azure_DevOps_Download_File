import tl = require('azure-pipelines-task-lib/task');
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
		
		console.log("[INFO] Starting downloading ...");
		await downloadFile(strUrl, ignoreCertificateChecks, authType, output, catchResponse).then(function(){
			tl.setResult(tl.TaskResult.Succeeded, "Wrapping successfull.");
		}).catch(function(error){
			throw new Error(error);
		});
				

	} catch (err) {
		tl.setResult(tl.TaskResult.Failed, err);
	}
	
}

function getOptions(strUrl: string, ignoreCertificateChecks: boolean, authType: string){

	var options = url.parse(strUrl);

	// Set protocol and port in needed
	switch(options.protocol){
		case "https:":
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
			var basicAuthUsername = tl.getInput('basicAuthUsername', true);
			var basicAuthPassword = tl.getInput('basicAuthPassword', true);
			console.log("[INFO] Authentication type : 'Basic Auth'");
			console.log("[INFO] Username : '" + basicAuthUsername + "'");
			console.log("[INFO] Password : '" + basicAuthPassword + "'");
			var base64 = Buffer.from(`${basicAuthUsername}:${basicAuthPassword}`).toString('base64');
			options.headers = {
				'Authorization': 'Basic ' + base64
			}
			break;
		case "bearer":
			var bearerToken = tl.getInput('bearerToken', true);
			console.log("[INFO] Authentication type : 'Bearer Token'");
			console.log("[INFO] Token : '" + bearerToken + "'");
			options.headers = {
				'Authorization': 'Bearer ' + bearerToken
			}
			break;
		case "noAuth":
		default:
			console.log("[INFO] Authentication type : 'No Auth'");
			break;
	}

	return options;
}

function downloadFile(strUrl: string, ignoreCertificateChecks: boolean, authType: string, output: string, catchResponse: boolean){

	return new Promise((resolve, reject) => {

		var protocol;
		var options = getOptions(strUrl, ignoreCertificateChecks, authType);

		switch(options.protocol){
			case "https:":
				protocol = https;
				break;
			case "http:":
				protocol = http;
				break;
			default:
				reject("Protocol not supported. HTTP or HTTPS are supported.");
		}

		var req = protocol.request(options, async (res) => {

			var binaryData = new Stream();
			var statusCode = res.statusCode;
			
			if(parseInt(statusCode) == 301 || parseInt(statusCode) == 302 || parseInt(statusCode) == 303){
				if(res.headers['location']){
					var location = res.headers['location'];
					console.log("[INFO] Redirection found new url : '" + location + "'");
					await downloadFile(location, ignoreCertificateChecks, authType, output, catchResponse);
					resolve(true);
				}
				else{
					reject("Error redirection url not found");
				}
			}
			else{
			
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
					resolve(true);
				});
			}
			
		}).on('error', function catchError(error) {
			throw new Error("Error when download file : " + error);
		});
		
		req.end();
	});
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
