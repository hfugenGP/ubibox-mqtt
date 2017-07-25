const Common = require('../lib/common');
const config = require('../config/conf');
const ZTEDataService = require('../services/zteDataService');

var zteDataService = new ZTEDataService();

var hexData = "555500553836313437333033303036383836376ae06a9506407a68ae3a374b24dd73f66294257c920a437338c3a340b44b71aad492941611c3189b5ca08baebf6b6d67db1a6eca8d41e3ad39ec3d51f4a873c8aaaa";
// var hexData = "5555005df9b865046e5f774c383631343733303330313437393335a0594f94147c478446935f644a9ad3484fbb573416e730c3b0bf2b7010c0b0e986658aed66c86b547b94e3ce56ee322a4b6c917a996ad1bf1c68057ee208bf72aaaa";

// var hexData = "555500358f3352e74d73e949383631343733303330313437393335132cd42e57f83b8aae33e28eb00b2e586977c4ea7a273824aaaa";

console.log('************************New data received************************');
console.log('DATA : ' + hexData);

if (!zteDataService.processData(hexData)) {
    return;
}

console.log('*****************************************************************');

var messageCallback = zteDataService.generateReply(hexData);

console.log('************************End data received************************');