angular.module("upload", []).directive('upload.image', ['$q', '$http', function ($q, $http) {
    var image = function ($scope) {
        var URL = window.URL || window.webkitURL,
            name = "image",
            resized = {},
            original = {};
        return {
            load: function (url) {
                var deferred = $q.defer();
                var img = new Image();
                img.onload = function () {
                    original = img;
                    $scope.$apply(deferred.resolve);
                };
                img.src = url;
                return deferred.promise;
            },
            read: function (file) {
                var deferred = $q.defer();
                if (!file || !file.type.match('image.*')) {
                    $scope.$apply(function () {
                        deferred.reject('Wrong image');
                    });
                    return deferred.promise;
                }
                var img = new Image();
                img.onload = function () {
                    name = file.name;
                    original = img;
                    $scope.$apply(deferred.resolve);
                };
                img.src = URL.createObjectURL(file);
                return deferred.promise;
            },
            blob: function () {
                return resized;
            },
            draw: function (id, options) {
                var deferred = $q.defer();
                var canvas = document.getElementById(id);
                if (!canvas) {
                    setTimeout(function () {
                        deferred.reject('No image element is set')
                    }, 100);
                    return deferred.promise;
                }
                options.maxHeight = options.maxHeight || 300;
                options.maxWidth = options.maxWidth || 250;
                options.quality = options.quality || 0.7;
                var height = original.height;
                var width = original.width;
                if (width > height) {
                    if (width > options.maxWidth) {
                        height = Math.round(height *= options.maxWidth / width);
                        width = options.maxWidth;
                    }
                } else {
                    if (height > options.maxHeight) {
                        width = Math.round(width *= options.maxHeight / height);
                        height = options.maxHeight;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                var context = canvas.getContext("2d");
                context.drawImage(original, 0, 0, width, height);
                canvas.toBlob(function (res) {
                    resized = res;
                    resized.name = name;
                    resized.url = URL.createObjectURL(res);
                    deferred.resolve();
                }, "image/jpeg", options.quality);
                return deferred.promise;
            }
        }
    };

    var spinner = function (id, options, rgb) {
        var timer, node, color = rgb || [0, 0, 0];

        function buildSpinner(data) {
            var position = function (obj) {
                var left, top;
                left = top = 0;
                if (obj.offsetParent) {
                    do {
                        left += obj.offsetLeft;
                        top += obj.offsetTop;
                    } while (obj = obj.offsetParent);
                }
                return {
                    x: left,
                    y: top
                };
            };
            var mainCanvas = document.getElementById(id);
            var mainPos = position(mainCanvas);
            var canvas = document.createElement("canvas");
            node = canvas;
            canvas.height = options.maxHeight;
            canvas.width = options.maxWidth;
            canvas.style.left = mainPos.x + mainCanvas.width / 2 - options.maxWidth / 2;
            canvas.style.top = mainPos.y + mainCanvas.height / 2 - options.maxHeight / 2;
            canvas.style.position = "absolute";
            canvas.style.zIndex = 1;
            document.body.appendChild(canvas);
            var ctx = canvas.getContext("2d"),
                i = 0, degrees = data.degrees, degreesList = [];

            for (i = 0; i < degrees; i++) {
                degreesList.push(i);
            }
            i = 0;
            timer = setInterval(draw, 5000 / degrees);

            function reset() {
                ctx.clearRect(0, 0, options.maxWidth, options.maxHeight); // clear canvas
                var left = degreesList.slice(0, 1);
                var right = degreesList.slice(1, degreesList.length);
                degreesList = right.concat(left);
            }

            function draw() {
                if (i == 0) {
                    reset();
                }
                ctx.save();

                var d = degreesList[i];
                var c = Math.floor(255 / degrees * i);
                ctx.strokeStyle = 'rgb(' + (c + color[0]) + ', ' + (c + color[1]) + ', ' + (c + color[2]) + ')';
                ctx.lineWidth = data.size;
                ctx.beginPath();
                var s = Math.floor(360 / degrees * (d));
                var e = Math.floor(360 / degrees * (d + 1)) - 1;
                ctx.arc(data.x, data.y, data.size, (Math.PI / 180) * s, (Math.PI / 180) * e, false);
                ctx.stroke();

                ctx.restore();
                i++;
                if (i >= degrees) {
                    i = 0;
                }
            }
        }

        return {
            start: function () {
                if (!timer) {
                    buildSpinner({ x: options.maxWidth / 2, y: options.maxHeight / 2, size: 10, degrees: 30 });
                }
            },
            stop: function () {
                if (timer) {
                    clearInterval(timer);
                    timer = undefined;
                    document.body.removeChild(node);
                }
            }
        }
    };

    var upload = function (url, params, blob) {
        var deferred = $q.defer();
        var formData = new FormData();
        formData.append('image', blob, blob.name);
            $http.post(url, formData, {
                headers: { 'Content-Type': false },
                transformRequest: angular.identity
            }).success(function () {
                    deferred.resolve();
                }).error(function () {
                    deferred.reject();
                });
        return deferred.promise;
    };

    return {
        restrict: 'EA',
        replace: true,
        scope: {
            src: '@',
            maxHeight: '@',
            maxWidth: '@',
            quality: '@',
            post: '@',
            params: '@',
            spinner: '@'
        },
        templateUrl: 'javascripts/uploads.html',

        link: function ($scope, $element, $attrs) {
            var spin = $attrs.spinner === "true" ? spinner("dimage_canvas",
                {maxHeight: $attrs.maxHeight, maxWidth: $attrs.maxWidth}) : undefined;
            $scope.dialog = function () {
                var theEvent = document.createEvent("MouseEvent");
                theEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                var element = document.getElementById('dimage_select_field');
                element.dispatchEvent(theEvent);
            };
            var img = image($scope);
            img.load($attrs.src).then(function () {
                img.draw("dimage_canvas", {
                    maxHeight: $attrs.maxHeight,
                    maxWidth: $attrs.maxWidth,
                    quality: $attrs.quality})
            });
            $element.bind('change', function (evt) {
                var file = $scope.file = evt.target.files[0];
                img.read(file).then(function () {
                    img.draw("dimage_canvas", {
                        maxHeight: $scope.maxHeight,
                        maxWidth: $scope.maxWidth,
                        quality: $scope.quality}).then(function () {
                            spin && spin.start();
                            upload($scope.post, $scope.params, img.blob()).then(function () {
                                    spin && spin.stop();
                                }, function () {
                                    spin && spin.stop();
                                }
                            );
                        });
                });
            });
        }
    }
}]);
