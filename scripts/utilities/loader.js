var utilities = utilities || {};
utilities.loader = {
    start: function (message) {
        if (message) {
            $('#loader').text(message);
        } else {
            $('#loader').html('<i class="fa fa-asterisk fa-spin fa-fw"></i>');
        }
        $('#loader').addClass("show-loader");

    },
    stop: function () {
        $('#loader').removeClass("show-loader");
    }
};