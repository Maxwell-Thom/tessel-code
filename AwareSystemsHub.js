var tessel = require( 'tessel' );
var wifi = require( 'wifi-cc3000' );
var https = require( 'https' );
var blelib = require('ble-ble113a');
var bufferEqual = require('buffer-equal');

//Declare Variables
var PARSE_APP = 'dmyx4Z4vH1QMhhU3ldzSmfOfYvfZ5R8TkiZsYzLa';
var PARSE_KEY = '3PhAe67CP7HzCyIPTsKzLm4awycyIQ4qajTF7Cmz';
var network = 'I are what it take to be the win'; // put in your network name here
var pass = 'nickisthebest'; // put in your password here, or leave blank for unsecured
var security = 'WPA2'; // other options are 'wep', 'wpa', or 'unsecured'
var timeouts = 1;

var uuid = new Buffer ('919CF805EE5548118C0CBBDE13AFF6E0', 'hex')

var activationCount = 0
var stabilityCount = 0

var oldX = "0"
var oldY = "0"
var oldZ = "0"

 var x = "0"
 var y = "0"
 var z = "0"



//initialize wifi, and only monitor sensors if wifi is connected
 if (wifi.isConnected())
 {
//initialize ble
var ble = blelib.use(tessel.port['A']);
//begin ble scanning
ble.on('ready', function(err) {
  //allow the scan to find the beacon over and over again
  ble.startScanning({allowDuplicates:true});
});
//define actions for ble discovery
ble.on('discover', function(peripheral) {
  //save the beacon
  var scanRecord = peripheral.advertisingData[1].raw;

  //verify the beacon has the correct uuid
  if(bufferEqual(scanRecord.slice(4,20), uuid)){
  //pull major and minor values out the beacon packet
  var major = scanRecord.slice(20,22).readInt16BE(0);
  var minor = scanRecord.slice(22,24).readInt16BE(0);

//initialize state values for first time use
if((x == "" || y == "" || z == "")){
  x = parseInt(major.toString(16).substring(2,4), 16);
  y = parseInt(minor.toString(16).substring(0,2), 16);
  z = parseInt(minor.toString(16).substring(2,4), 16);
  oldX = parseInt(major.toString(16).substring(2,4), 16);
  oldY = parseInt(minor.toString(16).substring(0,2), 16);
  oldZ = parseInt(minor.toString(16).substring(2,4), 16);
}

//if not first time use, update xyz for current position
else{
  x = parseInt(major.toString(16).substring(2,4), 16);
  y = parseInt(minor.toString(16).substring(0,2), 16);
  z = parseInt(minor.toString(16).substring(2,4), 16);
} 

//check to see if xyz changed
 if (x != oldX || y != oldY || z != oldZ){
    oldX = x
    oldY = y
    oldZ = z
    stabilityCount = 0
    activationCount = activationCount + 1

      if (activationCount == 3){ 
        activationFlagOn()
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
        activationFlagOff()
        console.log("Sensor is Stable:(", "x:" ,x, "y:" ,y , "z:",y,")");
        stabilityCount = 0
      }
   } 
}

else{
  console.log("Incorrect UUID, foriegn packet dropped!")
}

});
}
	

//if not connected, connect
else
{
	connect();
}


function activationFlagOn(){
  //assemble PUT request for parse
    putOptions = {
        headers: {
            'Content-Type': 'application/json',

            'X-Parse-Application-Id': PARSE_APP,
            'X-Parse-REST-API-Key': PARSE_KEY
        },
        hostname: 'api.parse.com',
        method: 'PUT',                    
        path: '/1/classes/sensors/zmOzKj4P2w',                    
        port: 443
    };

    //send PUT request to parse
   request = https.request( putOptions, function( response ) {                
        // Got a response
        response.on('data', function( data ) {
            console.log('PUT', data.toString().trim() );
        } );
    } );
    request.write( JSON.stringify( {
      activation_flag: true

    } ) );
    request.end();
            
    // Handle HTTPS error
    request.on( 'error', function( err ) {
        console.error( err );
    } );
}

function activationFlagOff(){
  //assemble PUT request for parse
    putOptions = {
        headers: {
            'Content-Type': 'application/json',

            'X-Parse-Application-Id': PARSE_APP,
            'X-Parse-REST-API-Key': PARSE_KEY
        },
        hostname: 'api.parse.com',
        method: 'PUT',                    
        path: '/1/classes/sensors/zmOzKj4P2w',                    
        port: 443
    };

    //send PUT request to parse
   request = https.request( putOptions, function( response ) {                
        // Got a response
        response.on('data', function( data ) {
            console.log('PUT', data.toString().trim() );
        } );
    } );
    request.write( JSON.stringify( {
      activation_flag: false

    } ) );
    request.end();
            
    // Handle HTTPS error
    request.on( 'error', function( err ) {
        console.error( err );
    } );
}



















//this block of functions is boilerplate wifi connection code------------------------------
function connect(){
  wifi.connect({
    security: security
    , ssid: network
    , password: pass
    , timeout: 5 // in seconds
  });
}

wifi.on('connect', function(data){
  // you're connected
  console.log("connect emitted", data);
});

wifi.on('disconnect', function(data){
  // wifi dropped, probably want to call connect() again
  console.log("disconnect emitted", data);
  connect()
})

wifi.on('timeout', function(err){
  // tried to connect but couldn't, retry
  console.log("timeout emitted");
  timeouts++;
  if (timeouts > 2) {
    // reset the wifi chip if we've timed out too many times
    powerCycle();
  } 
});

wifi.on('error', function(err){
  // one of the following happened
  // 1. tried to disconnect while not connected
  // 2. tried to disconnect while in the middle of trying to connect
  // 3. tried to initialize a connection without first waiting for a timeout or a disconnect
  console.log("error emitted", err);
});

// reset the wifi chip progammatically
function powerCycle(){
  // when the wifi chip resets, it will automatically try to reconnect
  // to the last saved network
  wifi.reset(function(){
    timeouts = 0; // reset timeouts
    console.log("done power cycling");
    // give it some time to auto reconnect
    setTimeout(function(){
      if (!wifi.isConnected()) {
        // try to reconnect
        connect();
      }
      }, 20 *1000); // 20 second wait
  })
}        
//end boilerplate code-----------------------------------------------------------


