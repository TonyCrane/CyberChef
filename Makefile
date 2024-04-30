.PHONY: dev build install deploy cdn-deploy

dev:
	@echo "Starting CyberChef..."
	@npm start

build:
	@echo "Building CyberChef..."
	@npm run build

install:
	@echo "Installing Dependencies..."
	@npm install

deploy:
	@echo "Copying files to server..."
	@scp -r build/prod/* aliyun:/websites/lab.tonycrane.cc/wwwroot/CyberChef

cdn-deploy:
	@echo "Run the following command on server:"
	@echo "  cd /websites/lab.tonycrane.cc/wwwroot/CyberChef"
	@echo "  sed -i 's/$$""{self.docURL}/https:\/\/cdn.tonycrane.cc\/lab\/CyberChef/g' assets/main.js"
	@echo "  sed -i 's/assets\//https:\/\/cdn.tonycrane.cc\/lab\/CyberChef\/assets\//g' index.html"
	@echo "  qshell qupload2 --bucket=tonycrane-cdn --key-prefix=lab/CyberChef/assets/ --src-dir=assets --overwrite"
	@echo "  qshell qupload2 --bucket=tonycrane-cdn --key-prefix=lab/CyberChef/modules/ --src-dir=modules --overwrite"