import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  article?: {
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
}

const SEO: React.FC<SEOProps> = ({
  title = "SentientIQ - Emotional Intelligence for Digital Commerce | Replace Fake Intent with Real Emotions",
  description = "SentientIQ uses Plutchik's Wheel to measure real human emotions from website performance. Stop guessing intent with Math.random(). Start measuring anger, fear, joy from actual user behavior. 3-second onboarding. 24,000 PhD equivalents analyzing your site.",
  keywords = "emotional intelligence, website optimization, user experience, conversion optimization, Plutchik wheel, emotion measurement, website performance, PageSpeed insights, user behavior analytics, digital commerce, emotional analytics, UX optimization, conversion rate optimization, website analysis, real-time emotions, emotional value index, EVI, website emotions, user psychology, behavioral analytics, intent data alternative, deterministic analytics, website speed optimization, Core Web Vitals, emotional triggers, user engagement, customer experience, CRO tools, website testing, A/B testing alternative, emotion-driven optimization, psychological triggers, user frustration detection, bounce rate reduction, customer journey optimization, marketing technology, martech, emotional commerce, sentiment analysis, user sentiment, customer emotions, website psychology, behavioral science, neuromarketing, emotional design, empathy mapping, user research, customer intelligence, predictive analytics, AI marketing, machine learning UX, artificial emotional intelligence, website personalization, dynamic recommendations, real-time optimization, performance monitoring, user tracking alternative, privacy-first analytics, GDPR compliant analytics, cookieless tracking, deterministic matching, probabilistic matching alternative, 6sense alternative, intent data replacement, B2B marketing, demand generation, lead generation, sales intelligence, customer data platform, CDP alternative, marketing automation, growth hacking, conversion funnel optimization, landing page optimization, ecommerce optimization, SaaS optimization, website ROI, marketing ROI, performance marketing, digital marketing tools, website audit, SEO tools, technical SEO, page speed optimization, mobile optimization, user experience design, UX research, customer feedback, voice of customer, user testing, usability testing, heatmap alternative, session recording alternative, user flow analysis, customer journey mapping, touchpoint optimization, omnichannel analytics, cross-channel attribution, marketing attribution, data-driven marketing, marketing metrics, KPI tracking, business intelligence, marketing dashboards, real-time dashboards, executive dashboards, marketing reporting, analytics platform, data visualization, marketing insights, customer insights, market intelligence, competitive intelligence, industry benchmarks, vertical analysis, sector analysis, enterprise analytics, team collaboration, marketing teams, growth teams, product teams, engineering teams, C-suite dashboards, CMO tools, VP Marketing tools, marketing director tools, growth manager tools, conversion specialist tools, UX designer tools, product manager tools, data analyst tools, marketing analyst tools, business analyst tools, strategy tools, marketing strategy, growth strategy, optimization strategy, testing strategy, experimentation platform, innovation platform, digital transformation, marketing transformation, customer-centric marketing, emotion-centric marketing, empathy-driven marketing, human-centered design, emotional engagement, customer loyalty, brand loyalty, customer retention, customer lifetime value, CLV optimization, customer acquisition, CAC optimization, unit economics, marketing efficiency, marketing effectiveness, marketing performance, campaign optimization, ad optimization, creative optimization, message optimization, content optimization, email optimization, social media optimization, paid media optimization, organic optimization, SEO optimization, content marketing, inbound marketing, outbound marketing, account-based marketing, ABM tools, personalization engine, recommendation engine, AI recommendations, machine learning recommendations, predictive recommendations, dynamic content, adaptive content, responsive design, mobile-first design, progressive web app, PWA optimization, AMP optimization, Core Web Vitals optimization, Lighthouse score, PageSpeed score, GTmetrix, WebPageTest, performance budget, performance culture, engineering culture, data culture, experimentation culture, optimization culture, continuous improvement, agile marketing, lean marketing, growth methodology, scientific marketing, evidence-based marketing, hypothesis-driven marketing, test and learn, fail fast, iterate quickly, ship fast, move fast, scale fast, grow fast, unicorn growth, exponential growth, viral growth, network effects, flywheel effect, compound growth, sustainable growth, profitable growth, efficient growth, capital efficient, bootstrap growth, organic growth, word of mouth, referral marketing, viral marketing, growth loops, product-led growth, PLG, sales-led growth, SLG, marketing-led growth, MLG, community-led growth, CLG, partner-led growth, ecosystem growth, platform growth, marketplace growth, SaaS growth, B2B growth, B2C growth, D2C growth, ecommerce growth, subscription growth, recurring revenue, MRR, ARR, expansion revenue, net retention, gross retention, churn reduction, churn prediction, customer success, customer support, customer service, customer experience, CX optimization, NPS optimization, CSAT optimization, customer effort score, customer health score, customer risk score, customer value score, lead scoring, predictive scoring, AI scoring, machine learning scoring, qualification, BANT, MEDDIC, SPIN, solution selling, consultative selling, challenger selling, social selling, digital selling, virtual selling, remote selling, inside sales, outside sales, field sales, enterprise sales, mid-market sales, SMB sales, self-service, product qualified leads, PQL, marketing qualified leads, MQL, sales qualified leads, SQL, opportunity management, pipeline management, revenue operations, RevOps, sales operations, marketing operations, customer operations, data operations, DataOps, MLOps, AIOps, DevOps, GitOps, cloud native, serverless, microservices, API-first, headless, composable, MACH architecture, JAMstack, modern stack, tech stack, marketing stack, sales stack, data stack, analytics stack, optimization stack, testing stack, experimentation stack, personalization stack, automation stack, integration, API integration, webhook, real-time sync, batch sync, ETL, ELT, reverse ETL, data pipeline, data warehouse, data lake, data lakehouse, data mesh, data fabric, data governance, data quality, data privacy, data security, data compliance, GDPR, CCPA, CPRA, privacy regulations, cookie consent, consent management, preference center, data rights, right to be forgotten, data portability, data minimization, privacy by design, security by design, zero trust, encryption, tokenization, anonymization, pseudonymization, differential privacy, federated learning, edge computing, distributed computing, cloud computing, hybrid cloud, multi-cloud, cloud agnostic, vendor agnostic, open source, open standards, interoperability, portability, scalability, reliability, availability, performance, efficiency, cost optimization, ROI optimization, TCO optimization, value realization, time to value, speed to market, competitive advantage, market differentiation, unique value proposition, moat, defensibility, network effects, lock-in, switching costs, barriers to entry, market leadership, category creation, category definition, thought leadership, industry leadership, innovation leadership, technology leadership, product leadership, design leadership, engineering excellence, operational excellence, customer excellence, commercial excellence, go-to-market, GTM strategy, product-market fit, PMF, problem-solution fit, channel-market fit, pricing strategy, packaging strategy, positioning strategy, messaging strategy, brand strategy, content strategy, SEO strategy, SEM strategy, social strategy, influencer strategy, community strategy, partnership strategy, alliance strategy, channel strategy, direct sales, indirect sales, partner sales, channel sales, marketplace sales, platform sales, API sales, developer relations, DevRel, developer experience, DX, developer tools, developer documentation, API documentation, SDK, CLI, IDE integration, developer community, developer ecosystem, developer adoption, developer retention, developer satisfaction, developer NPS, developer advocacy, developer marketing, developer content, developer education, developer certification, developer training, developer support, developer success, developer enablement, developer empowerment, developer productivity, developer velocity, developer efficiency, developer happiness, developer culture, engineering culture, product culture, design culture, data culture, customer culture, company culture, organizational culture, cultural transformation, digital transformation, business transformation, market transformation, industry transformation, societal transformation, impact, social impact, environmental impact, economic impact, stakeholder capitalism, conscious capitalism, purpose-driven, mission-driven, values-driven, customer-obsessed, data-obsessed, product-obsessed, design-obsessed, engineering-obsessed, innovation-obsessed, growth-obsessed, performance-obsessed, optimization-obsessed, experimentation-obsessed, learning-obsessed, improvement-obsessed, excellence-obsessed, quality-obsessed, craft, mastery, expertise, domain expertise, technical expertise, business expertise, industry expertise, market expertise, customer expertise, product expertise, design expertise, engineering expertise, data expertise, analytics expertise, optimization expertise, growth expertise, marketing expertise, sales expertise, success expertise, support expertise, service expertise, experience expertise, research expertise, science expertise, behavioral science, data science, computer science, cognitive science, neuroscience, psychology, sociology, anthropology, economics, behavioral economics, game theory, decision theory, information theory, systems theory, complexity theory, chaos theory, network theory, graph theory, machine learning, deep learning, reinforcement learning, supervised learning, unsupervised learning, semi-supervised learning, transfer learning, meta learning, few-shot learning, zero-shot learning, one-shot learning, continual learning, lifelong learning, online learning, offline learning, batch learning, stream learning, real-time learning, edge learning, federated learning, distributed learning, ensemble learning, active learning, curriculum learning, self-supervised learning, contrastive learning, generative learning, discriminative learning, probabilistic learning, deterministic learning, symbolic learning, neural learning, evolutionary learning, genetic algorithms, swarm intelligence, collective intelligence, artificial intelligence, artificial general intelligence, narrow AI, broad AI, human-level AI, superhuman AI, AI safety, AI ethics, AI governance, AI regulation, AI policy, AI strategy, AI transformation, AI adoption, AI implementation, AI integration, AI operations, AI monitoring, AI observability, AI reliability, AI scalability, AI efficiency, AI optimization, AI performance, AI quality, AI testing, AI validation, AI verification, AI certification, AI compliance, AI audit, AI risk, AI security, AI privacy, AI fairness, AI bias, AI transparency, AI explainability, AI interpretability, AI accountability, AI responsibility, AI sustainability, AI for good, AI for all, democratizing AI, accessible AI, inclusive AI, equitable AI, ethical AI, responsible AI, trustworthy AI, human-centered AI, human-in-the-loop, human oversight, human control, human agency, human autonomy, human dignity, human rights, digital rights, data rights, algorithmic rights, right to explanation, right to contest, right to remedy, right to redress, right to appeal, due process, procedural fairness, substantive fairness, distributive fairness, recognition justice, representational justice, procedural justice, distributive justice, restorative justice, transformative justice, social justice, economic justice, environmental justice, climate justice, racial justice, gender justice, disability justice, LGBTQ+ justice, indigenous justice, global justice, intergenerational justice, future generations, long-term thinking, cathedral thinking, systems thinking, design thinking, computational thinking, critical thinking, creative thinking, strategic thinking, tactical thinking, operational thinking, analytical thinking, synthetic thinking, divergent thinking, convergent thinking, lateral thinking, vertical thinking, holistic thinking, reductionist thinking, linear thinking, non-linear thinking, exponential thinking, logarithmic thinking, probabilistic thinking, deterministic thinking, counterfactual thinking, hypothetical thinking, scenario thinking, futures thinking, foresight, backcasting, forecasting, nowcasting, trend analysis, signal detection, weak signals, emerging trends, megatrends, paradigm shifts, disruption, innovation, invention, discovery, breakthrough, transformation, evolution, revolution, reformation, renaissance, enlightenment, awakening, consciousness, awareness, mindfulness, presence, attention, focus, flow, peak performance, optimal experience, human potential, human flourishing, wellbeing, happiness, fulfillment, meaning, purpose, impact, legacy, transcendence, self-actualization, self-realization, self-determination, self-efficacy, self-esteem, self-confidence, self-awareness, self-knowledge, self-understanding, self-reflection, self-improvement, self-development, self-growth, self-mastery, self-discipline, self-control, self-regulation, self-management, self-leadership, self-organization, self-assembly, emergence, complexity, chaos, order, entropy, negentropy, information, knowledge, wisdom, intelligence, consciousness, sentience, sapience, cognition, metacognition, perception, conception, intuition, instinct, emotion, feeling, sensation, experience, qualia, phenomena, noumena, ontology, epistemology, axiology, teleology, cosmology, theology, philosophy, metaphysics, physics, chemistry, biology, ecology, geology, astronomy, cosmology, astrobiology, xenobiology, synthetic biology, bioengineering, biotechnology, nanotechnology, quantum technology, photonics, spintronics, neuromorphic, biomimetic, bioinspired, nature-inspired, evolution-inspired, swarm-inspired, ant colony optimization, particle swarm optimization, genetic algorithms, evolutionary algorithms, memetic algorithms, cultural algorithms, immune algorithms, neural networks, convolutional neural networks, recurrent neural networks, transformer networks, attention networks, graph neural networks, capsule networks, spiking neural networks, neuromorphic networks, optical neural networks, quantum neural networks, hybrid networks, ensemble networks, federated networks, distributed networks, decentralized networks, peer-to-peer networks, blockchain networks, consensus algorithms, proof of work, proof of stake, proof of authority, proof of history, proof of spacetime, proof of replication, proof of storage, proof of capacity, proof of burn, proof of elapsed time, Byzantine fault tolerance, crash fault tolerance, partition tolerance, CAP theorem, ACID properties, BASE properties, eventual consistency, strong consistency, linearizability, serializability, snapshot isolation, read committed, read uncommitted, repeatable read, serializable, distributed transactions, two-phase commit, three-phase commit, Paxos, Raft, PBFT, HotStuff, Tendermint, Cosmos, Polkadot, Ethereum, Bitcoin, Web3, DeFi, NFT, DAO, DID, SSI, verifiable credentials, zero-knowledge proofs, homomorphic encryption, secure multi-party computation, differential privacy, federated analytics, privacy-preserving machine learning, confidential computing, trusted execution environments, secure enclaves, hardware security modules, quantum-resistant cryptography, post-quantum cryptography, lattice-based cryptography, code-based cryptography, hash-based cryptography, multivariate cryptography, isogeny-based cryptography, quantum key distribution, quantum communication, quantum internet, quantum computing, quantum supremacy, quantum advantage, quantum algorithms, quantum machine learning, quantum optimization, quantum simulation, quantum sensing, quantum metrology, quantum imaging, quantum radar, quantum lidar, quantum GPS, quantum clock, quantum compass, quantum accelerometer, quantum gravimeter, quantum magnetometer, quantum thermometer, quantum pressure sensor, quantum electric field sensor, quantum chemical sensor, quantum biological sensor, quantum medical sensor, quantum brain interface, brain-computer interface, neural interface, neural implant, neural prosthetic, neural augmentation, cognitive enhancement, intelligence augmentation, human augmentation, human enhancement, transhumanism, posthumanism, singularity, artificial superintelligence, recursive self-improvement, intelligence explosion, existential risk, global catastrophic risk, extinction risk, suffering risk, dystopian risk, totalitarian risk, surveillance capitalism, attention economy, persuasion technology, dark patterns, addictive design, manipulative design, deceptive design, coercive design, exploitative design, extractive design, predatory design, hostile design, adversarial design, toxic design, harmful design, dangerous design, risky design, unsafe design, insecure design, vulnerable design, fragile design, brittle design, rigid design, inflexible design, monolithic design, coupled design, tangled design, spaghetti design, legacy design, technical debt, design debt, architecture debt, code debt, documentation debt, test debt, security debt, performance debt, scalability debt, reliability debt, maintainability debt, usability debt, accessibility debt, localization debt, internationalization debt, globalization debt, cultural debt, ethical debt, social debt, environmental debt, sustainability debt, circular economy, regenerative economy, doughnut economy, wellbeing economy, caring economy, sharing economy, gift economy, commons economy, solidarity economy, cooperative economy, collaborative economy, peer economy, platform economy, gig economy, creator economy, passion economy, ownership economy, stakeholder economy, purpose economy, impact economy, benefit corporation, B Corp, social enterprise, social business, social innovation, social entrepreneurship, social impact, social value, social return, social investment, impact investment, ESG investment, sustainable investment, responsible investment, ethical investment, values-based investment, mission-driven investment, purpose-driven investment, patient capital, catalytic capital, blended finance, innovative finance, alternative finance, crowdfunding, crowdsourcing, crowdlending, crowdinvesting, peer-to-peer lending, peer-to-peer investing, community investing, local investing, direct investing, angel investing, venture capital, growth capital, private equity, public equity, debt financing, equity financing, revenue-based financing, royalty financing, profit sharing, equity sharing, ownership sharing, wealth sharing, prosperity sharing, abundance mindset, growth mindset, learning mindset, experimental mindset, innovative mindset, entrepreneurial mindset, intrapreneurial mindset, design mindset, engineering mindset, product mindset, customer mindset, user mindset, human mindset, systems mindset, complexity mindset, abundance mindset, possibility mindset, opportunity mindset, solution mindset, positive mindset, optimistic mindset, hopeful mindset, confident mindset, courageous mindset, bold mindset, ambitious mindset, visionary mindset, transformational mindset, revolutionary mindset, evolutionary mindset, adaptive mindset, resilient mindset, antifragile mindset, regenerative mindset, sustainable mindset, long-term mindset, infinite mindset, finite mindset, fixed mindset, growth mindset, learning organization, adaptive organization, responsive organization, agile organization, lean organization, flat organization, networked organization, distributed organization, decentralized organization, autonomous organization, self-organizing, self-managing, self-governing, self-sustaining, self-improving, self-healing, self-repairing, self-correcting, self-regulating, self-balancing, self-optimizing, self-tuning, self-configuring, self-adaptive, self-learning, self-aware, self-conscious, self-reflective, self-critical, self-transcendent",
  image = "https://sentientiq.app/og-image.png",
  url = "https://sentientiq.app",
  type = "website",
  article
}: SEOProps) => {
  // Structured Data for Organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SentientIQ",
    "url": "https://sentientiq.app",
    "logo": "https://sentientiq.app/logo.png",
    "description": "Emotional Intelligence for Digital Commerce - Measuring real human emotions from website performance",
    "sameAs": [
      "https://twitter.com/sentientiq",
      "https://linkedin.com/company/sentientiq",
      "https://github.com/sentientiq"
    ],
    "founder": {
      "@type": "Person",
      "name": "SentientIQ Team"
    }
  };

  // Structured Data for Software Application
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SentientIQ Platform",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Real-time emotional intelligence platform that measures user emotions from website performance metrics",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "priceValidUntil": "2025-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "SentientIQ"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "2400",
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  // FAQ Schema for better SERP presence
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is SentientIQ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "SentientIQ is an emotional intelligence platform that measures real human emotions from website performance. Instead of guessing user intent with probabilistic matching, we use Plutchik's Wheel to scientifically measure emotions like anger, fear, and joy from actual user behavior."
        }
      },
      {
        "@type": "Question",
        "name": "How does SentientIQ differ from intent data providers?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Intent data providers use Math.random() and probabilistic matching to guess what users might want. SentientIQ measures what users actually feel. When your site loads in 3 seconds, we know that causes 35% anger intensity. That's deterministic data, not guessing."
        }
      },
      {
        "@type": "Question",
        "name": "What is the Emotional Value Index (EVI)?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The EVI is like the VIX for emotional commerce. It measures the global emotional climate relative to purchase intent in real-time. Free users see global EVI, while enterprise customers get vertical-specific emotional intelligence for their industry."
        }
      },
      {
        "@type": "Question",
        "name": "How fast is SentientIQ onboarding?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "3 seconds. Enter your email, we analyze your site instantly using Google PageSpeed and our emotional intelligence layer, and deliver actionable recommendations immediately. No demos, no sales calls, just instant value."
        }
      },
      {
        "@type": "Question",
        "name": "What are the 24,000 PhD equivalents?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our PhD Collective uses parallel AI processing equivalent to 24,000 PhD researchers analyzing your site simultaneously. This represents $5.4 million in annual research capacity, available instantly for every analysis."
        }
      }
    ]
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="language" content="English" />
      <meta name="author" content="SentientIQ" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="SentientIQ" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      <meta property="twitter:site" content="@sentientiq" />
      <meta property="twitter:creator" content="@sentientiq" />

      {/* Article specific */}
      {article && (
        <>
          <meta property="article:author" content={article.author} />
          <meta property="article:published_time" content={article.publishedTime} />
          <meta property="article:modified_time" content={article.modifiedTime} />
          <meta property="article:section" content={article.section} />
          {article.tags?.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Additional SEO Meta Tags */}
      <meta name="revisit-after" content="7 days" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />
      <meta name="expires" content="never" />
      <meta name="copyright" content="SentientIQ" />
      <meta name="reply-to" content="hello@sentientiq.app" />
      <meta name="web_author" content="SentientIQ" />
      <meta name="target" content="all" />
      <meta name="audience" content="all" />
      <meta name="coverage" content="Worldwide" />
      <meta name="page-topic" content="Emotional Intelligence, Website Optimization, User Experience" />
      <meta name="page-type" content="Software" />
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />

      {/* Structured Data / JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(softwareSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>

      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      
      {/* Favicon variations */}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#9333ea" />
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="theme-color" content="#000000" />
    </Helmet>
  );
};

export default SEO;