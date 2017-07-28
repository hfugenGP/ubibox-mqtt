const Common = require('../lib/common');
const config = require('../config/conf');
const ZTEDataService = require('../services/zteDataService');

var zteDataService = new ZTEDataService();

// var hexData = "555500553836313437333033303036383836376ae06a9506407a68ae3a374b24dd73f66294257c920a437338c3a340b44b71aad492941611c3189b5ca08baebf6b6d67db1a6eca8d41e3ad39ec3d51f4a873c8aaaa";
// var hexData = "5555005df9b865046e5f774c383631343733303330313437393335a0594f94147c478446935f644a9ad3484fbb573416e730c3b0bf2b7010c0b0e986658aed66c86b547b94e3ce56ee322a4b6c917a996ad1bf1c68057ee208bf72aaaa";

// var hexData = "555500352c37e3e11c886b143836313437333033303134373933352313a8b89a4ab6cb9b3850150cf654e7d1d8fd3921fd443baaaa";
var hexData = "5555005dad1f936246283f283836313437333033303134373933354749b052a5016454ae027b1b681d525d77a04788bdb3692fc03d849e3ef8699ae9a7e6d5884fb6a93c088f3f3455b5bfb71cf15c4c4564e2df8a6e528f790d43aaaa";

console.log('************************New data received************************');
console.log('DATA : ' + hexData);

if (!zteDataService.processData(hexData)) {
    return;
}

console.log('*****************************************************************');

var messageCallback = zteDataService.generateReply(hexData);

console.log('************************End data received************************');