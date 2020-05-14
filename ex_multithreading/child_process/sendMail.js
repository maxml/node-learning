async function sendMultipleMails(mail) {
    console.log(`sendMultipleMails, mail: ${mail}`);

    return new Promise((resolve) => {
        const randNumber = Math.round(Math.random() * 100);
        console.log(randNumber);

        resolve(randNumber);
    });
}

process.on('message', (message) => {
    let numberOfMailsSend = 0;

    const promises = message.mails.map(sendMultipleMails);
    Promise.all(promises)
        .then(counters => {
            counters.map(i => {
                numberOfMailsSend += i;
            });

            process.send({ counter: numberOfMailsSend });
        });
});