-- SSC Uploader: starts the local pack uploader (if it isn't running) and opens it
set repo to "/Users/looplair/Documents/soul-sample-club"
try
	do shell script "/usr/bin/curl -fs -o /dev/null --max-time 2 http://127.0.0.1:4747/api/releases"
on error
	do shell script "cd " & quoted form of repo & " && nohup /usr/local/bin/node tools/uploader/server.mjs > \"$HOME/Library/Logs/ssc-uploader.log\" 2>&1 &"
	repeat 20 times
		delay 0.5
		try
			do shell script "/usr/bin/curl -fs -o /dev/null --max-time 2 http://127.0.0.1:4747/"
			exit repeat
		end try
	end repeat
end try
open location "http://localhost:4747"
