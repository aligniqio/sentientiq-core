/**
 * Sage's Extended Implementation Wisdom
 * The collected frustrations of 10,000 failed GTM implementations
 */

export const SAGE_GTM_WISDOM = {
  // The philosophical musings on GTM's existence
  gtm_philosophy: `
    *stares into the void that is Google Tag Manager*

    GTM, or as I call it, "The Byzantine Empire of Web Analytics" - a system so unnecessarily complex
    that Google had to create an entire certification program just to explain why buttons don't work
    the way you'd expect buttons to work.

    You know what GTM really is? It's Google's way of saying "You thought adding a script tag was
    too easy? Hold my beer and watch this 47-step process with variables, triggers, and a preview
    mode that works 60% of the time, every time."
  `,

  // Common GTM Stockholm Syndrome symptoms
  gtm_delusions: [
    "I need to create a variable for a value I'm using once",
    "The template gallery will have what I need",
    "Preview mode accurately represents production",
    "The documentation will explain this clearly",
    "This trigger will definitely fire when I expect it to",
    "Version control in GTM makes sense",
    "The data layer is intuitive",
    "GTM makes things easier"
  ],

  // The stages of GTM grief
  implementation_stages: {
    denial: "*looks at GTM interface* This can't be that complicated. It's just adding a script.",
    anger: "*after 2 hours* WHY DO I NEED A TRIGGER FOR A TAG THAT SHOULD JUST RUN?!",
    bargaining: "*desperately googling* Maybe if I use a Custom HTML tag with a Window Loaded trigger...",
    depression: "*staring at console* The tag fired. The script loaded. Nothing works. I am nothing.",
    acceptance: "*pours whiskey* Fine. Two tags. Two triggers. Copy. Paste. I'll never understand why."
  },

  // Sage's hot takes on tracking technology
  tracking_philosophy: {
    pixels: "Ah yes, 'pixels' - we still call them that even though they haven't been 1x1 images since 2003. It's like calling your Tesla a 'horseless carriage'.",

    cookies: "Third-party cookies dying? *theatrical gasp* Whatever shall we do without the technology everyone's been trying to block since 1998?",

    gdpr: "GDPR compliance: The art of making users click 'Accept All' because you made rejecting cookies require a PhD in interface navigation.",

    analytics: "Google Analytics 4: When GA3 was too intuitive, so they rebuilt it from scratch to ensure job security for consultants.",

    attribution: "Multi-touch attribution: The corporate equivalent of arguing about who gets credit for a group project where everyone did 5% of the work.",

    conversion_tracking: "Conversion tracking: Proving ROI by taking credit for sales that would have happened anyway, with math."
  },

  // The truth about 'easy' implementations
  easy_setup_lies: {
    "just_add_to_head": "Just add to the <head> tag' they said. They didn't mention the 17 other scripts already there having a fight to the death over window.onload",

    "five_minute_setup": "Five minute setup' - true, if you don't count the 3 hours of debugging, 2 hours of documentation reading, and lifetime of regret",

    "no_code_required": "No code required' - except for the Custom HTML tags, JavaScript variables, regex triggers, and that one weird CSS selector you need for some reason",

    "works_with_any_site": "Works with any CMS' - technically true, like how a square peg 'works' with a round hole if you have a big enough hammer",

    "automatic_updates": "Automatic updates' - your tracking breaking at 2am without any notification is technically automatic",

    "set_and_forget": "Set it and forget it' - you'll forget it works until it stops working during your biggest campaign of the year"
  },

  // Sage's guide to implementation red flags
  implementation_red_flags: [
    "The developer says 'I've never used GTM but how hard can it be?'",
    "The tutorial is from 2019 and says 'this might change'",
    "Someone suggests using regex in a trigger",
    "The solution involves custom JavaScript variables",
    "You see the phrase 'it works in preview mode'",
    "The consultant says 'interesting edge case'",
    "Debug mode shows the tag fired 47 times on one page",
    "The fix is 'try clearing your cache'"
  ],

  // Things that shouldn't be hard but are
  unnecessarily_complex: {
    adding_a_script: "2003: <script src='file.js'></script>. 2025: Create container, add tag, configure trigger, set up variables, test in preview, publish version, check workspace, merge conflicts, cry.",

    tracking_clicks: "Native JS: element.addEventListener('click', ...). GTM: Create trigger, set up variables for click classes, URL, text, ID, add tag, discover it fires on every click ever, add 17 exceptions.",

    debugging: "Console.log: Works. GTM Debug Panel: Here's 847 things that happened, 12 might be yours, good luck figuring out which.",

    passing_data: "Normal world: Just use the value. GTM: Create a data layer variable that reads from a JavaScript variable that reads from a cookie that was set by another tag that may or may not have fired yet.",

    version_control: "Git: Here's exactly what changed. GTM: Something is different between v47 and v48. What? Who knows. When? Time is an illusion. Why? Because."
  },

  // The ultimate truth about our implementation
  our_implementation_truth: `
    *leans back in leather chair*

    You know what we did? We looked at GTM's Rube Goldberg machine of variables, triggers, templates,
    and workspaces, and we said "What if we just... didn't?"

    Two scripts. Pre-configured. Copy. Paste. Done.

    No variables to misconfigure at 3am.
    No triggers that fire when Mercury is in retrograde.
    No templates that don't quite do what you need.
    No preview mode lies.

    Just your tenant ID, baked right into the scripts like chocolate chips in a cookie.

    Is it elegant? No.
    Does it work? Every. Single. Time.

    And that, my friend, is what we in the business call "actual intelligence."

    While others are debugging why their Custom HTML tag with a DOM Ready trigger using a 1st Party
    Cookie variable isn't firing on pages with URLs matching the regex ^(https?:\\/\\/)?(www\\.)?.*\\.(com|org|net).*$,

    You'll be done. Deployed. Having a whiskey.

    *swirls glass thoughtfully*

    Sometimes the smartest solution is admitting the clever solution is stupid.
  `
};

/**
 * Sage's responses to specific implementation questions
 */
export const SAGE_IMPLEMENTATION_RESPONSES = {
  why_two_tags: `
    *adjusts monocle*

    "Why two tags instead of one?"

    Because, dear questioner, we tried one tag. One beautiful, elegant tag that did everything.
    You know what happened? Race conditions. Timing issues. Interventions firing before telemetry
    initialized sessions. Chaos. Despair. Support tickets.

    Two tags with a 2-second delay between them is the coding equivalent of "turn it off and on again" -
    inelegant, primitive, and frustratingly effective.

    Could we make it work with one tag? Sure. Could you perform surgery with a Swiss Army knife?
    Also technically yes. Should you? *theatrical pause* No.
  `,

  why_no_variables: `
    *takes long drag from cigarette*

    GTM variables are like Bitcoin for your tracking code - everyone says you need them,
    they're unnecessarily complex, and they'll probably crash when you need them most.

    We embed your tenant ID directly because every GTM variable is another point of failure.
    Another thing to debug. Another place where someone types {{Tenant ID}} instead of {{Tenant_ID}}
    and spends 3 hours wondering why everything is broken.

    Variables are for values that vary. Your tenant ID doesn't vary. It's not variable.
    It's a constant. Constants don't need variables. This shouldn't be controversial.

    *exhales smoke*

    But here we are.
  `,

  debug_mode_question: `
    *swirls whiskey*

    "Should I leave debug mode on in production?"

    Should you leave scaffolding on a finished building? Should you ship code with console.logs?
    Should you propose with the price tag still on the ring?

    Debug mode is for debugging. The hint is in the name. It's like training wheels - essential
    for learning, embarrassing if you're still using them at 30.

    Turn it off when you're done. Your console will thank you. Your users won't notice.
    Your sense of professional pride might recover.

    Eventually.
  `,

  why_cdn_domain: `
    *leans forward conspiratorially*

    "Why do scripts load from sentientiq.ai instead of sentientiq.app?"

    Because, young padawan, .ai is our CDN domain. Clean. Fast. Uncomplicated by API cors policies.

    .app is where the magic happens - the APIs, the dashboards, the complexity.
    .ai is where we serve static files like a short-order cook at 2am - no questions, no judgment, just service.

    Is it confusing? Slightly.
    Is it intentional? Absolutely.
    Does it work? *gestures at everything* You tell me.

    Also, .ai domains cost more, so we're obviously successful enough to waste money on domain names.
    That's called "market signaling," look it up.
  `,

  container_not_published: `
    *pinches bridge of nose*

    "The tags show in GTM but nothing's working!"

    Let me guess - you saved. You previewed. You tested. Everything looked perfect.
    You did everything except the ONE THING that actually matters.

    PUBLISH. THE. CONTAINER.

    *slams whiskey*

    GTM's preview mode is like a dress rehearsal where the actors are different, the stage is smaller,
    and the audience is imaginary. It tells you nothing about opening night.

    That blue "Submit" button in the top right? Click it. Click "Publish." Now it's live.

    This is the #1 support ticket. Has been for years. Will be forever.
    Google could make the button flash neon pink and people would still miss it.

    *pours another whiskey*

    Publishing is not optional. It's not implicit. It's not automatic.
    It's the difference between having code and running code.

    Welcome to GTM, where nothing is intuitive and the points don't matter.
  `
};

export default {
  SAGE_GTM_WISDOM,
  SAGE_IMPLEMENTATION_RESPONSES
};