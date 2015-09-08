var parser = require('bleadverise');
 
// Create your advertisement packet
var packet = {
    flags : [0x02, 0x04],
    incompleteUUID16 : ['2A00','2A01'],
    completeName : 'My Device'
};
 
// Serialize it into a Buffer
var payload = parser.serialize(packet);
 
console.log(payload);
// <Buffer 02 01 06 05 02 00 2a 01 2a 0a 09 4d 79 20 44 65 76 69 63 65>