Angular directives for uploading
====================
## Description

This is a partial fork of [Mischi](https://github.com/Mischi/angularjs-imageupload-directive.git) imageupload directive.

In the future this would be a set of uploading directives for different kind of files.

## Run
```bash
  git clone https://github.com/imapi/angular-upload-image.git
  cd angular-upload-image
  npm install
  node app.js
```
## Usage
  
                <upload-image
                    src="http://localhost:8080/upload/test.jpg"
                    post="upload"
                    max-height="100"
                    max-width="100"
                    quality = "1"
                    after-event = "update"
                    spinner="true">
                </upload-image>

Where:
  src - image src
  post - url to post the new image
  max-height - max height for the image
  max-widht - max width for the image
  quality - encoding quality (jpg)
  after-event - event name which would be triggered after successful uploading, you can handle it via $scope.$on('event name')
  spinner - show uploading spinner

#Dependencies

- [blueimp/JavaScript-Canvas-to-Blob](https://github.com/blueimp/JavaScript-Canvas-to-Blob)
- [AngularJS](http://angularjs.org/)

#License
MIT

#Notes
Must work in all modern browsers, including new Safari 6
