import { parseSpeechBooking } from '../src/utils/voiceParser.js';

console.log('--- RUNNING VOICE PARSER TEST SUITE ---');

let failed = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed++;
  } else {
    console.log(`PASS: ${message}`);
  }
}

// 1. Natural phrase with name, phone, from, to, tomorrow, times
{
  const input = "My name is Rajesh Sharma, phone 9876543210, pickup from Mumbai Airport to Pune Station tomorrow at 10 AM to 4 PM please bring clean car";
  const res = parseSpeechBooking(input);
  assert(res.customerName === 'Rajesh Sharma', `Customer name parsed (${res.customerName})`);
  assert(res.customerPhone === '9876543210', `Customer phone parsed (${res.customerPhone})`);
  assert(res.pickupLocation?.toLowerCase().includes('mumbai airport'), `Pickup parsed (${res.pickupLocation})`);
  assert(res.dropLocation?.toLowerCase().includes('pune station'), `Drop parsed (${res.dropLocation})`);
  assert(res.startTime === '10:00', `Start time parsed (${res.startTime})`);
  assert(res.endTime === '16:00', `End time parsed (${res.endTime})`);
}

// 2. Name with 'I am' and 10 digit number
{
  const input = "I am Pooja Verma mobile 9123456789 from Dadar to Borivali at 3 PM";
  const res = parseSpeechBooking(input);
  assert(res.customerName === 'Pooja Verma', `Name parsed (${res.customerName})`);
  assert(res.customerPhone === '9123456789', `Phone parsed (${res.customerPhone})`);
  assert(res.startTime === '15:00', `Start time 3 PM parsed (${res.startTime})`);
  assert(res.endTime === '17:00', `End time auto-extended +2h (${res.endTime})`);
}

if (failed === 0) {
  console.log('ALL VOICE PARSER TESTS PASSED (100%)!');
} else {
  console.error(`${failed} TESTS FAILED!`);
  process.exit(1);
}
