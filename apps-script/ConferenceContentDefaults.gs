// Initial content migrated from data/conferences/*.json by setup().
const CONFERENCE_CONTENT_DEFAULTS = {
  "icai2026": {
    "id": "icai2026",
    "shortName": "ICAI2026",
    "name": "Artificial Intelligence Summit",
    "theme": "Responsible AI, practical applications, and collaborative research",
    "mode": "Online via Zoom",
    "timeDisplay": "10:00 AM – 01:35 PM (GMT)",
    "timezoneLabel": "GMT",
    "timeNote": "UK timings",
    "supportEmail": "public-health@innotiveconferences.com",
    "heroImage": "assets/images/hero_ai.png",
    "aboutImage": "assets/images/Common_Conference_Image.jpg",
    "seo": {
      "title": "ICAI2026 | Artificial Intelligence Summit | Innotive Conferences",
      "description": "Artificial Intelligence Summit (ICAI2026), December 27, 2026. Explore responsible AI, practical applications, and collaborative research. Register online."
    },
    "about": [
      "The Artificial Intelligence Summit brings together researchers, practitioners, and industry professionals to exchange perspectives on artificial intelligence and its applications.",
      "Sessions focus on machine learning, generative AI, data science, responsible development, and the opportunities and challenges of applying AI across research and industry."
    ],
    "topics": [
      "Machine Learning and Deep Learning",
      "Generative AI and Large Language Models",
      "Natural Language Processing",
      "Computer Vision and Robotics",
      "AI in Healthcare and Life Sciences",
      "Data Science and Big Data",
      "Responsible AI, Safety, and Ethics",
      "AI Governance and Regulation",
      "Human-AI Collaboration",
      "AI Applications in Industry"
    ],
    "schedule": [],
    "scheduleNotes": [],
    "speakerGroups": [],
    "guidelines": [],
    "faqs": []
  },
  "iccan2026": {
    "id": "iccan2026",
    "shortName": "ICCAN2026",
    "name": "Cancer Summit",
    "theme": "Progress in cancer science, prevention, and patient-centered care",
    "mode": "Online via Zoom",
    "timeDisplay": "10:00 AM – 01:35 PM (GMT)",
    "timezoneLabel": "GMT",
    "timeNote": "UK timings",
    "supportEmail": "public-health@innotiveconferences.com",
    "heroImage": "assets/images/conf_cancer.png",
    "aboutImage": "assets/images/Common_Conference_Image.jpg",
    "seo": {
      "title": "ICCAN2026 | Cancer Summit | Innotive Conferences",
      "description": "Cancer Summit (ICCAN2026), October 14, 2026. Exchange research on cancer science, prevention, and patient-centered care. Register online."
    },
    "about": [
      "The Cancer Summit brings together researchers, clinicians, and healthcare professionals to share current perspectives on cancer science and care.",
      "Topics span prevention, early detection, translational research, treatment approaches, clinical practice, and support for people affected by cancer."
    ],
    "topics": [
      "Cancer Biology and Translational Research",
      "Cancer Prevention and Early Detection",
      "Precision Oncology and Biomarkers",
      "Cancer Genomics and Molecular Diagnostics",
      "Immuno-Oncology",
      "Clinical Trials and Therapeutics",
      "Surgical and Radiation Oncology",
      "Cancer Epidemiology and Public Health",
      "Supportive Care and Survivorship",
      "Palliative and Patient-Centered Care"
    ],
    "schedule": [],
    "scheduleNotes": [],
    "speakerGroups": [],
    "guidelines": [],
    "faqs": []
  },
  "iccm2026": {
    "id": "iccm2026",
    "shortName": "ICCM2026",
    "name": "Cardiovascular Medicine Summit",
    "theme": "Advancing cardiovascular science, prevention, and care",
    "mode": "Online via Zoom",
    "timeDisplay": "10:00 AM – 01:35 PM (GMT)",
    "timezoneLabel": "GMT",
    "timeNote": "UK timings",
    "supportEmail": "public-health@innotiveconferences.com",
    "heroImage": "assets/images/conf_card.png",
    "aboutImage": "assets/images/Common_Conference_Image.jpg",
    "seo": {
      "title": "ICCM2026 | Cardiovascular Medicine Summit | Innotive Conferences",
      "description": "Cardiovascular Medicine Summit (ICCM2026), October 14, 2026. Share research on cardiovascular science, prevention, and care. Register online."
    },
    "about": [
      "The Cardiovascular Medicine Summit brings together researchers, clinicians, and healthcare professionals to discuss developments in cardiovascular science and medicine.",
      "The program is intended to support exchange across prevention, diagnostics, clinical care, cardiovascular research, and emerging approaches to heart and vascular health."
    ],
    "topics": [
      "Cardiovascular Epidemiology and Prevention",
      "Atherosclerosis and Vascular Biology",
      "Heart Failure and Cardiomyopathies",
      "Arrhythmias and Electrophysiology",
      "Interventional Cardiology",
      "Cardiac Imaging and Diagnostics",
      "Cardiovascular Surgery",
      "Hypertension and Metabolic Disease",
      "Digital Health in Cardiology",
      "Clinical and Translational Cardiovascular Research"
    ],
    "schedule": [],
    "scheduleNotes": [],
    "speakerGroups": [],
    "guidelines": [],
    "faqs": []
  },
  "icid2026": {
    "id": "icid2026",
    "shortName": "ICID2026",
    "name": "Infectious Diseases Summit",
    "theme": "Research and collaboration for infectious disease prevention and response",
    "mode": "Online via Zoom",
    "timeDisplay": "10:00 AM – 01:35 PM (GMT)",
    "timezoneLabel": "GMT",
    "timeNote": "UK timings",
    "supportEmail": "public-health@innotiveconferences.com",
    "heroImage": "assets/images/conf_infec.png",
    "aboutImage": "assets/images/Common_Conference_Image.jpg",
    "seo": {
      "title": "ICID2026 | Infectious Diseases Summit | Innotive Conferences",
      "description": "Infectious Diseases Summit (ICID2026), October 14, 2026. Discuss research and collaboration for infectious disease prevention and response. Register online."
    },
    "about": [
      "The Infectious Diseases Summit brings together researchers, clinicians, and public health professionals to exchange knowledge on infectious disease research and practice.",
      "Topics include emerging infections, antimicrobial resistance, vaccines, surveillance, prevention, and coordinated responses to infectious disease challenges."
    ],
    "topics": [
      "Emerging and Re-emerging Infectious Diseases",
      "Antimicrobial Resistance",
      "Virology and Viral Pathogenesis",
      "Bacteriology and Microbial Genomics",
      "Parasitic and Fungal Diseases",
      "Vaccines and Immunization",
      "Infection Prevention and Control",
      "Epidemiology and Public Health Surveillance",
      "Global Health Preparedness",
      "Diagnostics and Therapeutics"
    ],
    "schedule": [],
    "scheduleNotes": [],
    "speakerGroups": [],
    "guidelines": [],
    "faqs": []
  },
  "icph2026": {
    "id": "icph2026",
    "shortName": "ICPH2026",
    "name": "International Conference on Public Health",
    "theme": "Advancing Public Health Through Innovation, Equity, and Global Collaboration",
    "mode": "Online via Zoom",
    "timeDisplay": "10:00 AM – 01:35 PM (GMT)",
    "timezoneLabel": "GMT",
    "timeNote": "UK timings",
    "supportEmail": "public-health@innotiveconferences.com",
    "heroImage": "assets/images/hero_health.png",
    "aboutImage": "assets/images/Common_Conference_Image.jpg",
    "seo": {
      "title": "ICPH2026 | International Conference on Public Health | Innotive Conferences",
      "description": "International Conference on Public Health, October 14, 2026 – Advancing Public Health Through Innovation, Equity, and Global Collaboration. Submit abstracts, download the brochure and register online."
    },
    "about": [
      "The Innotive Conferences welcomes you to the International Conference on Public Health scheduled to be held on October 14th, 2026 under the theme Advancing Public Health Through Innovation, Equity, and Global Collaboration.",
      "Our premier event dedicated to the latest developments in the field of public health is set to bring together leading experts, researchers, and practitioners from around the globe. The influential gathering will serve as a platform for sharing groundbreaking research, discussion on innovative strategies, and addressing challenges in the realm of public health. By providing a dynamic space for professionals, researchers, and thought leaders to converge, our platform plays a pivotal role in shaping the future landscape of medicine, science, and technology.",
      "Our platform actively contributes to the dissemination of cutting-edge research, the integration of novel technologies, and the translation of scientific knowledge into real-world applications for the betterment of society."
    ],
    "topics": [
      "Health & Wellness Practitioner",
      "Health Economics and Nutrition",
      "Environmental Healthcare Practitioner",
      "Geriatric Nursing Practitioner",
      "Gynecology and Ob Neonatal Healthcare Practitioner",
      "Surgical Nursing Practitioner",
      "Pain Management Practitioner",
      "Ophthalmic Nursing Practitioner",
      "Registered Nurse Practitioner",
      "Family Nurse Practitioner",
      "Emergency Medicine",
      "Traditional Medicine",
      "Health Science",
      "Women Health",
      "Biomedical and Health Informatics",
      "Telemedicine and e-Health",
      "Anesthesia",
      "Oncology",
      "Optogenetics",
      "Optometry",
      "Parasitology",
      "Pathology",
      "Pharmacogenomics",
      "Pharmacology",
      "Family Medicine",
      "Mental Health",
      "Nutrition and Health",
      "Rehabilitation Therapy"
    ],
    "schedule": [
      {
        "start": "10:00",
        "end": "10:10",
        "meridiem": "AM",
        "title": "Opening Ceremony & Welcome Address",
        "description": "Introduction to webinar theme and objectives"
      },
      {
        "start": "10:10",
        "end": "10:35",
        "meridiem": "AM",
        "title": "Speaker 1"
      },
      {
        "start": "10:35",
        "end": "11:00",
        "meridiem": "AM",
        "title": "Speaker 2"
      },
      {
        "start": "11:00",
        "end": "11:25",
        "meridiem": "AM",
        "title": "Speaker 3"
      },
      {
        "start": "11:25",
        "end": "11:35",
        "meridiem": "AM",
        "title": "Short Break",
        "type": "break"
      },
      {
        "start": "11:35",
        "end": "12:00",
        "meridiem": "AM",
        "endMeridiem": "PM",
        "title": "Speaker 4"
      },
      {
        "start": "12:00",
        "end": "12:25",
        "meridiem": "PM",
        "title": "Speaker 5"
      },
      {
        "start": "12:25",
        "end": "12:50",
        "meridiem": "PM",
        "title": "Speaker 6"
      },
      {
        "start": "12:50",
        "end": "01:15",
        "meridiem": "PM",
        "title": "Speaker 7"
      },
      {
        "start": "01:15",
        "end": "01:35",
        "meridiem": "PM",
        "title": "Closing Remarks & Vote of Thanks"
      }
    ],
    "scheduleNotes": [
      "Each speaker is allocated ~20–25 minutes including Q&A.",
      "Total speakers: 6–8 (flexible based on availability).",
      "Schedule can be adjusted slightly depending on speaker count."
    ],
    "speakerGroups": [],
    "guidelines": [
      {
        "title": "Oral Presentation Guidelines",
        "items": [
          "After registering for the webinar, the user will receive a meeting invite containing a personalized user ID for accessing the webinar. Please check the junk mail folder if the email is not visible in the inbox.",
          "Please follow the provided steps to join the webinar 1 or 2 days before the event to avoid any potential technical issues on the day of the event.",
          "Please join the webinar 30 minutes early in order to minimize any potential last-minute issues.",
          "Oral presenters will be allocated 20 minutes time for their presentation and 5 minutes for questions and answers. 20 slides are optimal, allowing 1 minute per slide.",
          "Please ensure that your device meets the system requirements for running this application.",
          "It is recommended to attach an external device for audio.",
          "If the user is experiencing audio issues, they should check their application audio settings and their computer speakers.",
          "The user should find a quiet location with good network access and no disturbances in order to sit.",
          "Please mute your audio while others are presenting. Attendees who would like to ask questions or engage in discussion are kindly requested to raise their hands. The host will unmute them at the conclusion of the talk."
        ]
      },
      {
        "title": "Poster Presentation Guidelines",
        "items": [
          "The recommended poster size is 160cm (height) × 60cm (width).",
          "To ensure visual effectiveness of your poster, use large lettering and a minimum of text."
        ]
      }
    ],
    "faqs": [
      {
        "q": "Where does the webinar take place?",
        "a": "ICPH2026 is organizing through ZOOM platform followed by UK timings."
      },
      {
        "q": "What language is the webinar held in?",
        "a": "The official language of the conference is English and all sessions will be held in English language."
      },
      {
        "q": "How much time will be given for an oral presenter?",
        "a": "Each Oral Presenter will have 20-25 minutes for presentation including Q/A session."
      },
      {
        "q": "How much time will be given for a poster presenter?",
        "a": "Each Poster Presenter will have 10-15 minutes for presentation including Q/A session."
      },
      {
        "q": "How to submit an Abstract?",
        "a": "Send us your abstracts as per the sample template in Abstract Submission page or you can directly email to program co-ordinator email: public-health@innotiveconferences.com"
      },
      {
        "q": "Where do I go to submit an abstract?",
        "a": "You may submit proposals online via our Abstract Submission Portal or you can directly email to program co-ordinator."
      },
      {
        "q": "When does registration open?",
        "a": "Registration for International Conference on Public Health opens on 31st July, 2026"
      },
      {
        "q": "Where do I go to register for the ICPH2026?",
        "a": "You can register for the conference via our online registration form."
      },
      {
        "q": "What does my registration cost cover?",
        "a": [
          "Access to all Presentations.",
          "Get your abstract published with the DOI.",
          "E-Certificate for Presentation and Participation."
        ]
      },
      {
        "q": "Do you have any template for paper submission?",
        "a": "Yes, we have a template for abstract submission. Please download from this [link](@abstractTemplate)."
      },
      {
        "q": "When will I know if my paper has been accepted?",
        "a": "Once you submit the abstract, we will let you know the acceptance in 2-3 business days. If you are not receiving the acceptance of abstract, please contact: public-health@innotiveconferences.com"
      },
      {
        "q": "When should I submit my final presentation?",
        "a": "You have to send your final presentation through power point to the Program Co-Ordinator before one week of the webinar."
      }
    ],
    "benefits": [
      "E-Certificate for Presentation and Participation.",
      "Get your abstract published with the DOI.",
      "Reduced Costs and Affordability.",
      "Knock Down Geographical Barriers.",
      "Encouraged to publish full length articles in Supporting Journals.",
      "Great Resource for Learning New Career Skills.",
      "Global Exposure to Your Research.",
      "Access to all Presentations."
    ],
    "cancellationPolicy": [
      "Before 50 days of webinar: 75% refund.",
      "Within 30 days of webinar: No refund for registration.",
      "E-Poster & Video Presentations: Non-refundable."
    ]
  },
  "icre2026": {
    "id": "icre2026",
    "shortName": "ICRE2026",
    "name": "Renewable Energy Summit",
    "theme": "Innovation for a resilient, low-carbon energy future",
    "mode": "Online via Zoom",
    "timeDisplay": "10:00 AM – 01:35 PM (GMT)",
    "timezoneLabel": "GMT",
    "timeNote": "UK timings",
    "supportEmail": "public-health@innotiveconferences.com",
    "heroImage": "assets/images/conf_renew.png",
    "aboutImage": "assets/images/Common_Conference_Image.jpg",
    "seo": {
      "title": "ICRE2026 | Renewable Energy Summit | Innotive Conferences",
      "description": "Renewable Energy Summit (ICRE2026), October 14, 2026. Explore innovation for a resilient, low-carbon energy future. Register online."
    },
    "about": [
      "The Renewable Energy Summit brings together researchers, energy professionals, and policymakers to exchange ideas on clean energy technologies and deployment.",
      "Topics span renewable generation, storage, grid integration, sustainable fuels, efficiency, and the policies and investment approaches that support a lower-carbon energy system."
    ],
    "topics": [
      "Solar and Photovoltaic Systems",
      "Wind Energy and Offshore Systems",
      "Energy Storage and Battery Technologies",
      "Hydropower and Marine Energy",
      "Grid Integration and Smart Grids",
      "Green Hydrogen and E-fuels",
      "Energy Efficiency and Electrification",
      "Climate Policy and Sustainable Finance",
      "Circular Economy and Life-Cycle Assessment",
      "Renewable Energy Systems and Deployment"
    ],
    "schedule": [],
    "scheduleNotes": [],
    "speakerGroups": [],
    "guidelines": [],
    "faqs": []
  }
};
