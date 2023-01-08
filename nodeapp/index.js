/**
 * output format will be a new contract
 * leo object will have u128s represenitng the ipfs hash of a json file
 * input is a json file with the NFT properties, possibly a schema
 * output is a set of numbers representing the IPFS hash of that file
 * optional encryption key (numeric, u128) that has encrypted the NFT data
 * 
 * Can get mint # based on sorted list of ids and position within them
 * NFT really only needs a uniqie ID and the hash of the metadata
 * 
 *  */

const { exec } = require("child_process");
const express = require('express');
const fs = require('fs');
const util = require('util');
const crypto = require("crypto");

function md5(data) {
    return crypto.createHash("md5").update(data, "binary").digest("hex");
}

const Hash = require('ipfs-only-hash');
// const data = 'hello world!'
// const hash = await Hash.of(data)
// console.log(hash) // QmTp2hEo8eXRp6wg7jXv1BLC

const app = express();
const PORT = 3000;

// ALEO functions

// SpoofUser -> modify program.json to be the user we want to impersonate
// ExecuteAleo -> run our aleo app and call a function with arguments
// ComposeContract -> Generate issue commands for use by ExecuteAleo
// RenderWallet

const SpoofUser = async (uid) => {

    const userData = JSON.parse(fs.readFileSync(`./test_user_spoofs/${uid}.json`));

    fs.writeFileSync('../ipfs_nft/program.json', `{
        "program": "ipfs_nft.aleo",
        "version": "0.0.0",
        "description": "",
        "development": {
            "private_key": "${userData.PRIV}",
            "address": "${userData.ADDR}"
        },
        "license": "MIT"
    }`);

    return userData;
};

const ExecuteAleo = async (fn, ...args) => {

    const promiseExec = util.promisify(exec);

    return promiseExec(`leo run ${fn} ${args.join(' ')}`, { cwd: '../ipfs_nft' });
};

const getCIDReducer = (...args) => {
    let byteArray = [];
    const BigNumProc = (vals, bignum) => {
        let chunk = [];
        let encNum = BigInt(bignum);
        const b256 = BigInt(256);
        console.log(vals, bignum)
        for (let i = 0; i < vals; i++) {
            chunk.push(encNum % b256);

            encNum = (encNum - (encNum % b256)) / b256;
        }
        return chunk.reverse();
    }

    args.forEach(arg => {
        byteArray = byteArray.concat(BigNumProc(arg.values, arg.total));

    });

    return byteArray;
}

const getCIDFromParts = (bin1, bin2, bin3) => {
    return String.fromCharCode(...getCIDReducer(
        { values: 23, total: bin1 },
        { values: 23, total: bin2 }
    ).map(
        x => Number(x)
    )
    );
}

const CollectibleReducer = (owner, collection, id, cid) => {
    const toBytes = Array.from(Buffer.from(cid, 'utf8'));
    const arr2uint128 = (arr) => {
        let sum = BigInt(arr[0]);
        for (let i = 0; i < arr.length; i++) {
            sum = (sum * BigInt(256)) + BigInt(arr[i]);
        }

        return sum.toString(10);
    }

    const new_id = BigInt('0x' + md5(cid)).toString(10);
    const coll_id = BigInt('0x' + md5(collection)).toString(10);
    // big endian
    const bin1arr = toBytes.slice(0, 23);
    const bin2arr = toBytes.slice(23, 46);
    //const bin3arr = toBytes.slice(32, 46);

    const bin1 = arr2uint128(bin1arr);
    const bin2 = arr2uint128(bin2arr);
    //const bin3 = arr2uint128(bin3arr);

    if (cid !== getCIDFromParts(bin1, bin2)) {
        throw "CID conversion error!";
    }


    return `${owner} ${id}u64 ${new_id}field ${coll_id}field ${bin1}field ${bin2}field`;

}

app.get("/reduce", (req, res) => {

    const CID = "QmTyd71MZB3ZrHReo2vaMgcyHSrziSjn8GJxRj4HsG97QE";
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.write(CollectibleReducer("iowndis", "NickCollection", 1, CID));
    res.end();
});


app.get("/banktx", async (req, res) => {
    // vm.aleo.org/api/testnet3/records/all 
    // Body contains VIEW KEY

    try {
        const bank = await SpoofUser("bank");

        const apires = await fetch('https://vm.aleo.org/api/testnet3/records/all', {
            method: 'POST',
            body: bank.VIEW
        });
        res.send(apires);
    } catch (ex) {
        res.send(ex);
    }

});

app.get("/mint_test", async (req, res) => {

    const resWrite = (str) => {
        console.log(str);
        res.write(str.replaceAll("\n", "<br />"));
    }

    const Aleo = async (fn, ...args) => {
        const { error, stdout, stderr } = await ExecuteAleo(fn, ...args)

        if (error) {
            resWrite("ERROR: " + error);
        }

        if (stderr) {
            resWrite("STDERROR: " + stderr);
        }


        resWrite(stdout);
    };

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    resWrite("Context Switch: Bank\n");
    const bank = await SpoofUser("bank");
    console.log(bank);
    resWrite("Executing test functions (this may take a while)...\n");
    try {
        resWrite("Calling main.\n");
        await Aleo("main", "1field");

        const CID = "QmTyd71MZB3ZrHReo2vaMgcyHSrziSjn8GJxRj4HsG97QE";
        const mintCommand = CollectibleReducer(bank.ADDR, "BankCollection", 1, CID);
        resWrite(`Calling mint with a 1/1 CID based NFT being sent to the bank.\nCommand: mint ${mintCommand}`);

        await Aleo("mint", ...mintCommand.split(" "));


    }
    catch (ex) {
        resWrite(JSON.stringify(ex));
    }


    res.end();


});

app.listen(PORT, (error) => {
    if (!error)
        console.log("Server is Successfully Running, and App is listening on port " + PORT);
    else
        console.log("Error occurred, server can't start", error);
}
);