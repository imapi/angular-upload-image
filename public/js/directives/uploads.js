var module = angular.module('uploads', []);

module.directive('uploadImage', ['$q', '$http', function ($q, $http) {
    function Img($scope) {
        var URL = window.URL || window.webkitURL,
            name = "image",
            resized = {},
            original = {};

        this.load = function (url) {
            var deferred = $q.defer();
            var img = new Image();
            img.onload = function () {
                original = img;
                $scope.$apply(deferred.resolve);
            };
            img.src = url;
            return deferred.promise;
        };

        this.read = function (file) {
            var deferred = $q.defer();
            if (!file || !file.type.match('image.*')) {
                return $q.reject('Wrong image');
            }
            var img = new Image();
            img.onload = function () {
                name = file.name;
                original = img;
                $scope.$apply(deferred.resolve);
            };
            img.src = URL.createObjectURL(file);
            return deferred.promise;
        };

        this.blob = function () {
            return resized;
        };

        this.draw = function (element) {
            var deferred = $q.defer(),
                options = {};
            if (!element) {
                return $q.reject('No image element is set');
            }
            options.maxHeight = $scope.maxHeight || 300;
            options.maxWidth = $scope.maxWidth || 250;
            options.quality = $scope.quality || 1;
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
            element.width = width;
            element.height = height;
            var context = element.getContext("2d");
            context.drawImage(original, 0, 0, width, height);
            element.toBlob(function (res) {
                resized = res;
                resized.name = name;
                resized.url = URL.createObjectURL(res);
                deferred.resolve();
            }, "image/png", options.quality);
            return deferred.promise;
        }
    }

    function Spinner(element, options, rgb) {
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
            var mainPos = position(element);
            var canvas = document.createElement("canvas");
            node = canvas;
            canvas.height = options.maxHeight;
            canvas.width = options.maxWidth;
            canvas.style.left = mainPos.x + element.width / 2 - options.maxWidth / 2;
            canvas.style.top = mainPos.y + element.height / 2 - options.maxHeight / 2;
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

        this.start = function () {
            if (!timer) {
                buildSpinner({ x: options.maxWidth / 2, y: options.maxHeight / 2, size: 10, degrees: 30 });
            }
        };

        this.stop = function () {
            if (timer) {
                clearInterval(timer);
                timer = undefined;
                document.body.removeChild(node);
            }
        }
    }

    var upload = function (url, blob) {
        var deferred = $q.defer();
        var formData = new FormData();
        formData.append('image', blob, blob.name);
        $http.post(url, formData, {
            headers: { 'Content-Type': false },
            transformRequest: angular.identity
        }).success(function () {
                deferred.resolve();
            }).error(function (reason) {
                deferred.reject(reason);
            });
        return deferred.promise;
    };

    var buildUrl = function(base, params, disableCache) {
        var salt = disableCache ? new Date().getTime() : "";
        if (!params) {
            params = "";
        } else if (params instanceof Function) {
            params = params();
        }
        if (params === "") {
            return url + "?" + salt;
        } else if (params.contain("?")) {
            return url + params + "&" + salt;
        }
        return url + params + "?" + salt;

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
            srcParams: '=',
            postParams: '=',
            spinner: '@',
            afterEvent: '@'
        },
        templateUrl: '/js/directives/uploads.html',

        link: function ($scope, $element, $attrs) {
            var spinner,
                canvas = $element.children()[0],
                img = new Img($scope);

            if ($attrs.spinner === "true") {
                spinner = new Spinner(canvas, $attrs);
            }

            var src = buildUrl($attrs.src, $scope.srcParams, true);
            img.load(src).then(function () {
                img.draw(canvas);
            });

            $element.bind('change', function (evt) {
                var file = $scope.file = evt.target.files[0];
                img.read(file).then(function () {
                    img.draw(canvas).then(function () {
                        spinner && spinner.start();
                        var post = buildUrl($scope.post, $scope.params, false);
                        upload(post, img.blob()).then(function () {
                                spinner && spinner.stop();
                                $scope.afterEvent && $scope.$emit($scope.afterEvent);
                            }, function () {
                                spinner && spinner.stop();
                            }
                        );
                    });
                });
            });
        }
    }
}]);
