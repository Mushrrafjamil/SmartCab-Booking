const http = require('http');

const postJSON = (path, data, token = null) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5005,
      path: path,
      method: 'POST',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
};

const getJSON = (path, token = null) => {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5005,
      path: path,
      method: 'GET',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
};

async function runTests() {
  console.log('--- STARTING BACKEND ENDPOINT TESTS ---');
  try {
    // 1. Try to Login with seeded passenger account
    console.log('\nTesting Login...');
    const loginRes = await postJSON('/api/auth/login', {
      email: 'john@gmail.com',
      password: 'password123'
    });

    if (loginRes.statusCode !== 200 || !loginRes.data.success) {
      console.error('FAIL: Login failed', loginRes);
      return;
    }
    const token = loginRes.data.accessToken;
    console.log('SUCCESS: Logged in successfully. Token length:', token.length);

    // 2. Fetch profile
    console.log('\nTesting Fetch Profile...');
    const profileRes = await getJSON('/api/users/profile', token);
    if (profileRes.statusCode !== 200 || !profileRes.data.success) {
      console.error('FAIL: Fetch profile failed', profileRes);
      return;
    }
    console.log('SUCCESS: Profile fetched. Name:', profileRes.data.user.name);

    // 3. Get Fare Estimate
    console.log('\nTesting Fare Estimate...');
    const estimateRes = await getJSON('/api/rides/estimate?distance=10&duration=20&vehicleType=sedan', token);
    if (estimateRes.statusCode !== 200 || !estimateRes.data.success) {
      console.error('FAIL: Estimate failed', estimateRes);
      return;
    }
    console.log('SUCCESS: Estimate received. Final Fare: ₹' + estimateRes.data.estimate.finalFare);

    // 4. Book a Ride
    console.log('\nTesting Ride Booking...');
    const bookRes = await postJSON('/api/rides/book', {
      pickup: { address: 'Bengaluru Airport', lat: 13.1986, lng: 77.7066 },
      destination: { address: 'Bengaluru Center', lat: 12.9716, lng: 77.5946 },
      distance: 35,
      duration: 50,
      vehicleType: 'sedan',
      paymentMethod: 'cash'
    }, token);

    if (bookRes.statusCode !== 201 || !bookRes.data.success) {
      console.error('FAIL: Booking failed', bookRes);
      return;
    }
    console.log('SUCCESS: Ride booked successfully. Ride ID:', bookRes.data.ride._id);
    console.log('--- ALL CORE ENDPOINT TESTS COMPLETED SUCCESSFULLY ---');
  } catch (error) {
    console.error('FAIL: Network request error. Is server running on port 5005?', error.message);
  }
}

runTests();
