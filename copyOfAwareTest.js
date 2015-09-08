var tessel = require( 'tessel' );
var wifi = require( 'wifi-cc3000' );
var https = require( 'https' );
var blelib = require('ble-ble113a');
var bufferEqual = require('buffer-equal');

//Declare Variables
var PARSE_APP = 'dmyx4Z4vH1QMhhU3ldzSmfOfYvfZ5R8TkiZsYzLa';
var PARSE_KEY = '3PhAe67CP7HzCyIPTsKzLm4awycyIQ4qajTF7Cmz';
var network = "T-Mobile Broadband28"; // put in your network name here
var pass = '21577328'; // put in your password here, or leave blank for unsecured
var security = 'wpa2'; // other options are 'wep', 'wpa', or 'unsecured'
var timeouts = 1;
var activationCount = 0
var stabilityCount = 0
var httpSuccess = true
var transitionCheck = [0,1]
var state = "off";

var oldX = "0"
var oldY = "0"
var oldZ = "0"
var x = "0"
var y = "0"
var z = "0"
var requestPendingOn;
var requestPendingOff;

//set uuid of aware sensors to avoid picking up other beacons
var uuid = new Buffer ('919CF805EE5548118C0CBBDE13AFF6E0', 'hex')

//initialize wifi, and only monitor sensors if wifi is connected
 if (wifi.isConnected())
 {
var led3 = tessel.led[2].output(1);
var led4 = tessel.led[3].output(1);

    led3.toggle();
    led4.toggle();
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
    //verrify any past notifications have been sent
 
  //verify the beacon has the correct uuid
  if(bufferEqual(scanRecord.slice(4,20), uuid)){
  //pull major and minor values out the beacon packet
    var major = scanRecord.slice(20,22).readInt16BE(0);
    var minor = scanRecord.slice(22,24).readInt16BE(0);

  //initialize state values for first time use
  if((x == "" || y == "" || z == "")){
    //set variables to the major and minor values in beacon advertisment packet
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
    //reset stability count
    stabilityCount = 0
    //increment activation count
    activationCount = activationCount + 1
      // if activation count has counted twice
      if (activationCount >= 3){ 
        console.log("Sensor is moving:(", "x:" ,x, "y:" ,y , "z:",y,")");
        //reset counter
        activationCount = 0
        //verify that the is switching states from stable to activation
        //if(transitionCheck[0] == 0 && transitionCheck[1] == 1){
        if(state == "off"){
          state = "on";
          //change http success to false (pause program until http success equals true)  
          //call http request to turn on activation flag
          if(httpSuccess){
            httpRequest(activationFlagOn)
          }

          else{
           requestPendingOn = true
          }
        }
      }
  }

  // see the above if statement,they have  nearly identical functionality. this one just sets stable state rather than activation state
  else if(x == oldX && y == oldY && z == oldZ){

    oldX = x
    oldY = y
    oldZ = z
    activationCount = 0
    stabilityCount = stabilityCount + 1

      if (stabilityCount >= 3){
          console.log("Sensor is Stable:(", "x:" ,x, "y:" ,y , "z:",y,")");
          stabilityCount = 0

        //if(transitionCheck[0] == 1 && transitionCheck[1] == 0){
        if(state == "on"){

           state = "off";
           if(httpSuccess){
              httpRequest(activationFlagOff)
            }

            else {
              requestPendingOff = true
            }

        }
      }
   }
}

    else{
      //console.log("Incorrect UUID, foriegn packet dropped!")
    }

    });
  } 

//if not connected, connect
else
{
	connect();
}

//this function first calls its call back
function httpRequest(callback)
{
  // ********* i think this is redundant, please check ************
  httpSuccess = false
  callback();
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
      console.log('on request')
    //send PUT request to parse
   request = https.request( putOptions, function( response ) {                
        // Got a response
        response.on('data', function( data ) {
            // set transition states for an activated sensor
            transitionCheck[0] = 0
            transitionCheck[1] = 1
            //unpause packet sniffer

            //review
            if(requestPendingOn == true){
              activationFlagOn()
              requestPendingOn = false
            } else if (requestPendingOff) {
              activationFlagOff()
              requestPendingOff = false
            }
            else {
              httpSuccess = true  
            }
            //review^
            console.log('PUT','on', data.toString().trim() );
        } );
    } );

    // submit json to server
    request.write( JSON.stringify( {
      activation_flag: true

    } ) );
    request.end();
            
    // Handle HTTPS error
    request.on( 'error', function( err ) {
        console.log('http error below here')
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
      console.log('off request')
    //send PUT request to parse
   request = https.request( putOptions, function( response ) {                
        // Got a response
        response.on('data', function( data ) {
            transitionCheck[0] = 1
            transitionCheck[1] = 0

            //review
            if(requestPendingOn == true){
              activationFlagOn()
              requestPendingOn = false
            } else if (requestPendingOff) {
              activationFlagOff()
              requestPendingOff = false
            }
            else {
              httpSuccess = true  
            }
            console.log('PUT','off', data.toString().trim() );
        } );
    } );
    request.write( JSON.stringify( {
      activation_flag: false

    } ) );
    request.end();
            
    // Handle HTTPS error
    request.on( 'error', function( err ) {
        console.log('http error below here')
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


