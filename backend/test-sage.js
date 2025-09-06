/**
 * Test Sage API with real LinkedIn spam
 */

import fetch from 'node-fetch';

const SAGE_API = 'http://localhost:8004';

// Real LinkedIn spam examples
const testMessages = [
  {
    sender: "Kavita Varshney",
    message: `Hi Matt,

Hope you are doing well.

You've been selected as a great fit for our Excellence Award. The steps for becoming an honoree involve a further round of screening on the call as well as filling out the honoree application form.

Here is our meeting link to make it easier for you:
https://calendly.com/foundersusa/apr26?utm_source=Kavita&utm_medium=A

P.S. - Below is a document for your kind consideration before we speak.
https://hubs.ly/Q037RpRb0

Talk to you soon!`
  },
  {
    sender: "Murali Mohan",
    message: `Hey Matt, I noticed we share mutual connections, including Collin Davis (Cognition Florida). Do you know him personally? I recently worked with their team on software development projects, and since you lead SentientIQ, I thought you might be interested in ways to reduce development costs for your clients. What do you think? I own a software dev agency in the UK, we might collaborate`
  },
  {
    sender: "Sales Rep",
    message: `Hi Matt! 👋

I came across your profile and was impressed by your work at SentientIQ. 

We help companies like yours accelerate their growth with our AI-powered outreach platform. I'd love to show you how we're getting 10x response rates for similar companies.

Do you have 15 minutes this week for a quick call? Here's my calendar: [link]

Best,
Sarah`
  },
  {
    sender: "Conference Organizer",
    message: `Congratulations Matt!

You've been nominated as a Top Marketing Technology Innovator by your peers. We'd like to invite you to speak at our exclusive CEO Summit in Dubai.

This is a paid speaking opportunity ($5,000 honorarium) plus travel. 

There's just a small registration fee of $2,500 to secure your spot.

Interested?`
  }
];

async function testSage() {
  console.log('🧪 Testing Sage API...\n');
  
  // Test health endpoint
  try {
    const healthRes = await fetch(`${SAGE_API}/health`);
    const health = await healthRes.json();
    console.log('✅ Health check:', health);
    console.log('');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('Make sure Sage API is running on port 8004');
    process.exit(1);
  }
  
  // Test each message
  for (const test of testMessages) {
    console.log('━'.repeat(60));
    console.log(`📧 Testing message from: ${test.sender}`);
    console.log(`Message preview: ${test.message.substring(0, 100)}...`);
    console.log('');
    
    try {
      const response = await fetch(`${SAGE_API}/api/sage/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: test.message,
          sender: test.sender,
          platform: 'linkedin'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const analysis = result.analysis;
        console.log(`🎯 Bullshit Score: ${(analysis.bullshit_score * 100).toFixed(0)}%`);
        console.log(`📊 Recommendation: ${analysis.recommendation}`);
        console.log(`🎭 Tactics: ${analysis.manipulation_tactics.join(', ')}`);
        console.log(`🎯 Hidden Agenda: ${analysis.hidden_agenda}`);
        console.log(`💭 Sage says: ${result.sage_says}`);
        
        if (analysis.pattern_detected) {
          console.log(`⚠️  Pattern Alert: ${analysis.pattern_note}`);
        }
      } else {
        console.log('❌ Analysis failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
    
    console.log('');
  }
  
  // Test batch analysis
  console.log('━'.repeat(60));
  console.log('📚 Testing batch analysis...');
  
  try {
    const batchRes = await fetch(`${SAGE_API}/api/sage/batch-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: testMessages.map(m => ({
          message: m.message,
          sender: m.sender,
          platform: 'linkedin'
        }))
      })
    });
    
    const batchResult = await batchRes.json();
    console.log(`✅ Batch complete: ${batchResult.analyzed} analyzed, ${batchResult.failed} failed`);
  } catch (error) {
    console.log('❌ Batch analysis failed:', error.message);
  }
  
  console.log('\n✨ Sage testing complete!');
}

// Run the test
testSage().catch(console.error);