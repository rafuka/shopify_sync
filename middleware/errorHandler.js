function errorHandler(error, req, res, next) {
    console.error('There has been an error:');
    console.error(error.message);
    res.sendStatus(400);
}

module.exports = errorHandler;