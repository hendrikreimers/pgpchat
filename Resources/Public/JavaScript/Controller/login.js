angular.module('SecureChat').controller('Login', ['$scope', '$http', function($scope, $http) {

    $scope.formData = {};
    $scope.error    = false;

    $scope.processLogin = function() {
        if ( ($scope.formData.username != '') && ($scope.formData.password != '') ) {
            $http({
                method  : 'POST',
                url     : '/login',
                data    : $scope.formData,
                headers : { 'Content-Type': 'application/json;charset=utf-8' }
            }).success(function(data) {
                if (!data.success) {
                    $scope.error = true;
                    $scope.formData.password = '';
                } else {
                    $scope.error = false;

                    // Redirect on success with the token
                    if ( !data.token ) {
                        $scope.error = true;
                    } else {
                        window.location.href = '/chat/' + data.token;
                    }
                }
            });
        }
    };

}]);