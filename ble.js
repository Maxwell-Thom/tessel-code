var tessel = require('tessel');
var blelib = require('ble-ble113a');
var bufferEqual = require('buffer-equal');

var uuid = new Buffer ('919CF805EE5548118C0CBBDE13AFF6E0', 'hex')

var activationCount = 0
var stabilityCount = 0

var oldX = ""
var oldY = ""
var oldZ = ""

 var x = ""
 var y = ""
 var z = ""

var ble = blelib.use(tessel.port['A']);

ble.on('ready', function(err) {
  ble.startScanning({allowDuplicates:true});
});


ble.on('discover', function(peripheral){
  var scanRecord = peripheral.advertisingData[1].raw;


if(bufferEqual(scanRecord.slice(4,20), uuid)){
  var major = scanRecord.slice(20,22).readInt16BE(0);
  var minor = scanRecord.slice(22,24).readInt16BE(0);
  



if((x == "0" || y == "0" || z == "0")){
  x = parseInt(major.toString(16).substring(2,4), 16); // major
  y = parseInt(major.toString(16).substring(0,2), 16); // minor
  z = parseInt(major.toString(16).substring(2,4), 16); // minor
  oldX = parseInt(major.toString(16).substring(2,4), 16);
  oldY = parseInt(minor.toString(16).substring(0,2), 16);
  oldZ = parseInt(minor.toString(16).substring(2,4), 16);
}

else {
  x = parseInt(major.toString(16).substring(2,4), 16);
  y = parseInt(minor.toString(16).substring(0,2), 16);
  z = parseInt(minor.toString(16).substring(2,4), 16);  
}
    if (x != oldX || y != oldY || z != oldZ){

    //console.log("SEND ALERT TO PHONE")
    oldX = x
    oldY = y
    oldZ = z
    stabilityCount = 0
    activationCount = activationCount+1

      if (activationCount == 3){ 
        console.log("Sensor is moving:(", "x:" ,x, "y:" ,y , "z:",y,")");
        activationCount = 0
      }
  }

    else if(x == oldX || y == oldY || z == oldZ){

    oldX = x
    oldY = y
    oldZ = z
    activationCount = 0
    stabilityCount = stabilityCount + 1

      if (stabilityCount == 2){
        console.log("Sensor is Stable:(", "x:" ,x, "y:" ,y , "z:",y,")");
        stabilityCount = 0
      }
   }
} 
 
else{
  console.log("Incorrect UUID, foriegn packet dropped!")
}

});

