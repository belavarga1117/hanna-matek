// Generated research reference records. Static research context only; never use for personal percentiles.
export const cognitiveReferenceData = [
  {
    "sourceId": "10.3389/fpsyg.2014.00939",
    "citation": "Brunetti, R., Del Gatto, C. & Delogu, F. (2014). eCorsi: implementation and testing of the Corsi block-tapping task for digital tablets. Frontiers in Psychology, 5, 939.",
    "url": "https://doi.org/10.3389/fpsyg.2014.00939",
    "sourceType": "primary-paper",
    "license": {
      "code": "CC-BY",
      "reuse": "data-reuse",
      "evidenceUrl": "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00939/full"
    },
    "task": {
      "name": "eCorsi span",
      "version": "2014 study build; exact software version not reported",
      "direction": "forward-and-backward",
      "modality": "tablet-touch",
      "language": "not reported",
      "stoppingRule": "Two trials at each length, starting at 2; advance after at least one correct sequence; terminate after both sequences at a length are wrong.",
      "scoring": "Span is the last sequence length reproduced with one or zero errors before termination."
    },
    "sample": {
      "country": "Italy",
      "n": 107,
      "ageMin": 18,
      "ageMax": null,
      "inclusion": "Right-handed; normal or corrected vision; older group >50, no self-reported neuropsychological disease and SPMSQ <=2."
    },
    "table": {
      "locator": "Table 1 (Span FW / Span BW), article p. 5",
      "values": [
        {
          "sourceId": "10.3389/fpsyg.2014.00939",
          "locator": "Table 1 (Span FW / Span BW), article p. 5",
          "ageLabel": "18–30",
          "n": 73,
          "metric": "maximum-span-forward",
          "mean": 6.109,
          "sd": 0.803,
          "percentiles": null,
          "direction": "forward",
          "unit": "items"
        },
        {
          "sourceId": "10.3389/fpsyg.2014.00939",
          "locator": "Table 1 (Span FW / Span BW), article p. 5",
          "ageLabel": "18–30",
          "n": 73,
          "metric": "maximum-span-backward",
          "mean": 5.287,
          "sd": 1.199,
          "percentiles": null,
          "direction": "backward",
          "unit": "items"
        },
        {
          "sourceId": "10.3389/fpsyg.2014.00939",
          "locator": "Table 1 (Span FW / Span BW), article p. 5",
          "ageLabel": ">50",
          "n": 34,
          "metric": "maximum-span-forward",
          "mean": 4.764,
          "sd": 1.189,
          "percentiles": null,
          "direction": "forward",
          "unit": "items"
        },
        {
          "sourceId": "10.3389/fpsyg.2014.00939",
          "locator": "Table 1 (Span FW / Span BW), article p. 5",
          "ageLabel": ">50",
          "n": 34,
          "metric": "maximum-span-backward",
          "mean": 4.352,
          "sd": 1.303,
          "percentiles": null,
          "direction": "backward",
          "unit": "items"
        }
      ]
    },
    "applicability": {
      "personalPercentile": false,
      "reason": "The age groups, instruction language and exact touchscreen geometry do not match hanna-spatial-span-v1; the publication reports group means, not an individual norm conversion."
    }
  },
  {
    "sourceId": "10.1080/13803395.2010.493149",
    "citation": "Woods, D. L. et al. (2011). Improving digit span assessment of short-term verbal memory. Journal of Clinical and Experimental Neuropsychology, 33(1), 101–111.",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2978794/",
    "sourceType": "primary-paper",
    "license": {
      "code": "publisher-copyright-author-manuscript",
      "reuse": "link-only",
      "evidenceUrl": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2978794/"
    },
    "task": {
      "name": "Computerized auditory digit span, Experiment 2",
      "version": "Experiment 2 randomized-list adaptive procedure",
      "direction": "forward-and-backward",
      "modality": "computer-auditory-examiner-keyboard-entry",
      "language": "English",
      "stoppingRule": "Ten lists per direction; 1:2 staircase: a correct list increases length by one, two successive errors at the same length decrease it by one. Forward starts at 5, backward at 4.",
      "scoring": "Mean span (average tested list length) and maximum list length; verbal response transcribed by examiner."
    },
    "sample": {
      "country": "New Zealand",
      "n": 763,
      "ageMin": 18,
      "ageMax": 65,
      "inclusion": "Rotorua community volunteers, resident at least 3 years; community exposure strata; mean age 46.5."
    },
    "table": {
      "locator": "Table 6, Experiment 2 (Means and SDs), manuscript p. 10",
      "values": [
        {
          "sourceId": "10.1080/13803395.2010.493149",
          "locator": "Table 6, Experiment 2 (Means and SDs), manuscript p. 10",
          "ageLabel": "18–65",
          "n": 763,
          "metric": "forward-mean-span",
          "mean": 6.52,
          "sd": 1.0,
          "percentiles": null,
          "direction": "forward",
          "unit": "digits"
        },
        {
          "sourceId": "10.1080/13803395.2010.493149",
          "locator": "Table 6, Experiment 2 (Means and SDs), manuscript p. 10",
          "ageLabel": "18–65",
          "n": 763,
          "metric": "backward-mean-span",
          "mean": 4.91,
          "sd": 1.06,
          "percentiles": null,
          "direction": "backward",
          "unit": "digits"
        },
        {
          "sourceId": "10.1080/13803395.2010.493149",
          "locator": "Table 6, Experiment 2 (Means and SDs), manuscript p. 10",
          "ageLabel": "18–65",
          "n": 763,
          "metric": "forward-maximum-list-length",
          "mean": 6.77,
          "sd": 1.03,
          "percentiles": null,
          "direction": "forward",
          "unit": "digits"
        },
        {
          "sourceId": "10.1080/13803395.2010.493149",
          "locator": "Table 6, Experiment 2 (Means and SDs), manuscript p. 10",
          "ageLabel": "18–65",
          "n": 763,
          "metric": "backward-maximum-list-length",
          "mean": 5.19,
          "sd": 1.09,
          "percentiles": null,
          "direction": "backward",
          "unit": "digits"
        }
      ]
    },
    "applicability": {
      "personalPercentile": false,
      "reason": "Adult English auditory/verbal examiner-entered adaptive protocol differs from hanna-digit-span-v1 touch response and two-trials-per-length stopping rule; publication reuse is link-only."
    }
  },
  {
    "sourceId": "10.4306/pi.2014.11.1.39",
    "citation": "Choi, H. J. et al. (2014). A normative study of the digit span in an educationally diverse elderly population. Psychiatry Investigation, 11(1), 39–43.",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3942550/",
    "sourceType": "primary-paper",
    "license": {
      "code": "CC-BY-NC-3.0",
      "reuse": "link-only",
      "evidenceUrl": "https://creativecommons.org/licenses/by-nc/3.0/"
    },
    "task": {
      "name": "Korean WAIS-R Digit Span",
      "version": "Korean WAIS-R standardized administration; edition named, item set not reproduced",
      "direction": "forward-and-backward",
      "modality": "examiner-auditory-oral",
      "language": "Korean",
      "stoppingRule": "Two trials per length; forward begins at 3, backward at 2; stop after both trials at one length fail.",
      "scoring": "Separate forward and backward WAIS-R raw scores (correct trials), not maximum span length."
    },
    "sample": {
      "country": "Republic of Korea",
      "n": 784,
      "ageMin": 60,
      "ageMax": 90,
      "inclusion": "Healthy community-dwelling Seoul-area volunteers; adequate hearing; excluded dementia and serious neurological, medical or psychiatric disorders; education 0–25 years."
    },
    "table": {
      "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
      "values": [
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 9,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 3.89,
          "sd": 2.15,
          "percentiles": {
            "5": 1
          },
          "direction": "forward",
          "median": 4,
          "subgroup": {
            "sex": "male",
            "educationYears": "0–3"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 9,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 3.56,
          "sd": 0.88,
          "percentiles": {
            "5": 2
          },
          "direction": "backward",
          "median": 4,
          "subgroup": {
            "sex": "male",
            "educationYears": "0–3"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 60,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 5.52,
          "sd": 2.48,
          "percentiles": {
            "5": 2
          },
          "direction": "forward",
          "median": 5,
          "subgroup": {
            "sex": "male",
            "educationYears": "4–9"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 60,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 4.47,
          "sd": 1.56,
          "percentiles": {
            "5": 2
          },
          "direction": "backward",
          "median": 4,
          "subgroup": {
            "sex": "male",
            "educationYears": "4–9"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 109,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 7.58,
          "sd": 2.49,
          "percentiles": {
            "5": 3
          },
          "direction": "forward",
          "median": 8,
          "subgroup": {
            "sex": "male",
            "educationYears": ">=10"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 109,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 5.42,
          "sd": 1.55,
          "percentiles": {
            "5": 3
          },
          "direction": "backward",
          "median": 6,
          "subgroup": {
            "sex": "male",
            "educationYears": ">=10"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 101,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 3.66,
          "sd": 1.73,
          "percentiles": {
            "5": 2
          },
          "direction": "forward",
          "median": 3,
          "subgroup": {
            "sex": "female",
            "educationYears": "0–3"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 101,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 2.86,
          "sd": 1.43,
          "percentiles": {
            "5": 0
          },
          "direction": "backward",
          "median": 3,
          "subgroup": {
            "sex": "female",
            "educationYears": "0–3"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 167,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 4.93,
          "sd": 2.02,
          "percentiles": {
            "5": 2
          },
          "direction": "forward",
          "median": 5,
          "subgroup": {
            "sex": "female",
            "educationYears": "4–9"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 167,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 4.12,
          "sd": 1.46,
          "percentiles": {
            "5": 2
          },
          "direction": "backward",
          "median": 4,
          "subgroup": {
            "sex": "female",
            "educationYears": "4–9"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 116,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 6.86,
          "sd": 2.02,
          "percentiles": {
            "5": 4
          },
          "direction": "forward",
          "median": 7,
          "subgroup": {
            "sex": "female",
            "educationYears": ">=10"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "60–74",
          "n": 116,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 5.05,
          "sd": 1.54,
          "percentiles": {
            "5": 2.85
          },
          "direction": "backward",
          "median": 5,
          "subgroup": {
            "sex": "female",
            "educationYears": ">=10"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 8,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 4.13,
          "sd": 1.13,
          "percentiles": {
            "5": 3
          },
          "direction": "forward",
          "median": 4,
          "subgroup": {
            "sex": "male",
            "educationYears": "0–3"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 8,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 3.13,
          "sd": 1.46,
          "percentiles": {
            "5": 0
          },
          "direction": "backward",
          "median": 4,
          "subgroup": {
            "sex": "male",
            "educationYears": "0–3"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 41,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 5.2,
          "sd": 2.1,
          "percentiles": {
            "5": 2
          },
          "direction": "forward",
          "median": 5,
          "subgroup": {
            "sex": "male",
            "educationYears": "4–9"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 41,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 4.27,
          "sd": 1.38,
          "percentiles": {
            "5": 2.1
          },
          "direction": "backward",
          "median": 4,
          "subgroup": {
            "sex": "male",
            "educationYears": "4–9"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 39,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 6.28,
          "sd": 1.96,
          "percentiles": {
            "5": 4
          },
          "direction": "forward",
          "median": 6,
          "subgroup": {
            "sex": "male",
            "educationYears": ">=10"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 39,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 5.23,
          "sd": 1.75,
          "percentiles": {
            "5": 3
          },
          "direction": "backward",
          "median": 5,
          "subgroup": {
            "sex": "male",
            "educationYears": ">=10"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 53,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 3.04,
          "sd": 1.21,
          "percentiles": {
            "5": 2
          },
          "direction": "forward",
          "median": 3,
          "subgroup": {
            "sex": "female",
            "educationYears": "0–3"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 53,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 2.55,
          "sd": 1.15,
          "percentiles": {
            "5": 0.7
          },
          "direction": "backward",
          "median": 2,
          "subgroup": {
            "sex": "female",
            "educationYears": "0–3"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 53,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 4.58,
          "sd": 2.17,
          "percentiles": {
            "5": 1.7
          },
          "direction": "forward",
          "median": 4,
          "subgroup": {
            "sex": "female",
            "educationYears": "4–9"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 53,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 3.94,
          "sd": 1.46,
          "percentiles": {
            "5": 1.7
          },
          "direction": "backward",
          "median": 4,
          "subgroup": {
            "sex": "female",
            "educationYears": "4–9"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 28,
          "metric": "WAIS-R-digit-span-forward-raw",
          "mean": 6.25,
          "sd": 2.84,
          "percentiles": {
            "5": 2
          },
          "direction": "forward",
          "median": 6,
          "subgroup": {
            "sex": "female",
            "educationYears": ">=10"
          },
          "unit": "raw points"
        },
        {
          "sourceId": "10.4306/pi.2014.11.1.39",
          "locator": "Table 4 (Normative data of digit span test), article pp. 43–44",
          "ageLabel": "75–90",
          "n": 28,
          "metric": "WAIS-R-digit-span-backward-raw",
          "mean": 4.96,
          "sd": 1.88,
          "percentiles": {
            "5": 2
          },
          "direction": "backward",
          "median": 5,
          "subgroup": {
            "sex": "female",
            "educationYears": ">=10"
          },
          "unit": "raw points"
        }
      ]
    },
    "applicability": {
      "personalPercentile": false,
      "reason": "Korean older-adult examiner-administered WAIS-R protocol, stratification and noncommercial article licence do not match the Hanna protocol or product use."
    }
  },
  {
    "sourceId": "10.1037/a0012577",
    "citation": "Emery, L., Hale, S. & Myerson, J. (2008/2009). Age differences in proactive interference, working memory, and abstract reasoning. Psychology and Aging, 23(3), 634–645.",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2556888/",
    "sourceType": "primary-paper",
    "license": {
      "code": "publisher-copyright-author-manuscript",
      "reuse": "link-only",
      "evidenceUrl": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2556888/"
    },
    "task": {
      "name": "Traditional Operation Span",
      "version": "Emery–Hale–Myerson traditional OSpan",
      "direction": "serial-word-recall",
      "modality": "computer-visual-examiner-paced-oral",
      "language": "English",
      "stoppingRule": "No adaptive stopping: 16 sets, four each at list lengths 2–5, randomized one per length within four blocks.",
      "scoring": "One point only when every word in a set, and no extra word, is recalled; total 0–16. Processing equations are judged aloud."
    },
    "sample": {
      "country": "United States",
      "n": 153,
      "ageMin": 18,
      "ageMax": 95,
      "inclusion": "Screened for neuropsychological and serious psychiatric history; final groups after health/performance exclusions; high-average IQ limits generalizability."
    },
    "table": {
      "locator": "Table 1 (Means and Standard Deviations for Participant Characteristics), article p. 638",
      "values": [
        {
          "sourceId": "10.1037/a0012577",
          "locator": "Table 1 (Means and Standard Deviations for Participant Characteristics), article p. 638",
          "ageLabel": "18–29",
          "n": 67,
          "metric": "traditional-operation-span",
          "mean": 10.5,
          "sd": 2.8,
          "percentiles": null,
          "unit": "fully-correct sets out of 16"
        },
        {
          "sourceId": "10.1037/a0012577",
          "locator": "Table 1 (Means and Standard Deviations for Participant Characteristics), article p. 638",
          "ageLabel": "60–79",
          "n": 67,
          "metric": "traditional-operation-span",
          "mean": 7.6,
          "sd": 2.5,
          "percentiles": null,
          "unit": "fully-correct sets out of 16"
        },
        {
          "sourceId": "10.1037/a0012577",
          "locator": "Table 1 (Means and Standard Deviations for Participant Characteristics), article p. 638",
          "ageLabel": "80–95",
          "n": 19,
          "metric": "traditional-operation-span",
          "mean": 6.6,
          "sd": 2.2,
          "percentiles": null,
          "unit": "fully-correct sets out of 16"
        }
      ]
    },
    "applicability": {
      "personalPercentile": false,
      "reason": "English word/arithmetic, oral examiner-paced all-or-nothing scoring differs from hanna-complex-span-v1 spatial storage, symmetry decisions and 75% compliance rule."
    }
  },
  {
    "sourceId": "10.1371/journal.pone.0101750",
    "citation": "Harel, B. T. et al. (2014). The Development of Associate Learning in School Age Children. PLOS ONE, 9(7), e101750.",
    "url": "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0101750",
    "sourceType": "primary-paper",
    "license": {
      "code": "CC-BY",
      "reuse": "data-reuse",
      "evidenceUrl": "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0101750"
    },
    "task": {
      "name": "Continuous Paired Associate Learning (CPAL)",
      "version": "CogState-supplied CPAL, 2014 study configuration; software version not reported",
      "direction": "pattern-to-location learning",
      "modality": "computer-touch",
      "language": "English",
      "stoppingRule": "Loads 2,4,6,8,10 in ascending order; one exposure plus six learning trials per load; task ends automatically at 20 minutes and incomplete administrations were excluded.",
      "scoring": "Total selection errors accumulated over six learning trials at each load; feedback continues until the correct location is found."
    },
    "sample": {
      "country": "Australia",
      "n": 125,
      "ageMin": 5,
      "ageMax": 10,
      "inclusion": "Elementary-school children, English first language; excluded physical, sensory or cognitive impairment, special education and CNS-active medication."
    },
    "table": {
      "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
      "values": [
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "5–6",
          "n": 30,
          "metric": "total-errors",
          "mean": 5.5,
          "sd": 6.8,
          "percentiles": null,
          "memoryLoad": 2,
          "min": 0,
          "max": 26,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "5–6",
          "n": 30,
          "metric": "total-errors",
          "mean": 13.4,
          "sd": 12.0,
          "percentiles": null,
          "memoryLoad": 4,
          "min": 0,
          "max": 50,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "5–6",
          "n": 30,
          "metric": "total-errors",
          "mean": 34.5,
          "sd": 19.9,
          "percentiles": null,
          "memoryLoad": 6,
          "min": 7,
          "max": 76,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "5–6",
          "n": 30,
          "metric": "total-errors",
          "mean": 73.9,
          "sd": 38.0,
          "percentiles": null,
          "memoryLoad": 8,
          "min": 0,
          "max": 168,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "5–6",
          "n": 30,
          "metric": "total-errors",
          "mean": 102.6,
          "sd": 63.7,
          "percentiles": null,
          "memoryLoad": 10,
          "min": 0,
          "max": 237,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "7–8",
          "n": 49,
          "metric": "total-errors",
          "mean": 2.1,
          "sd": 2.9,
          "percentiles": null,
          "memoryLoad": 2,
          "min": 0,
          "max": 17,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "7–8",
          "n": 49,
          "metric": "total-errors",
          "mean": 8.1,
          "sd": 7.5,
          "percentiles": null,
          "memoryLoad": 4,
          "min": 0,
          "max": 37,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "7–8",
          "n": 49,
          "metric": "total-errors",
          "mean": 26.8,
          "sd": 18.8,
          "percentiles": null,
          "memoryLoad": 6,
          "min": 4,
          "max": 73,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "7–8",
          "n": 49,
          "metric": "total-errors",
          "mean": 60.5,
          "sd": 29.1,
          "percentiles": null,
          "memoryLoad": 8,
          "min": 15,
          "max": 143,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "7–8",
          "n": 49,
          "metric": "total-errors",
          "mean": 89.7,
          "sd": 52.8,
          "percentiles": null,
          "memoryLoad": 10,
          "min": 7,
          "max": 219,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "9–10",
          "n": 46,
          "metric": "total-errors",
          "mean": 0.8,
          "sd": 1.1,
          "percentiles": null,
          "memoryLoad": 2,
          "min": 0,
          "max": 5,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "9–10",
          "n": 46,
          "metric": "total-errors",
          "mean": 3.6,
          "sd": 4.5,
          "percentiles": null,
          "memoryLoad": 4,
          "min": 0,
          "max": 21,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "9–10",
          "n": 46,
          "metric": "total-errors",
          "mean": 19.9,
          "sd": 16.6,
          "percentiles": null,
          "memoryLoad": 6,
          "min": 2,
          "max": 88,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "9–10",
          "n": 46,
          "metric": "total-errors",
          "mean": 47.0,
          "sd": 21.9,
          "percentiles": null,
          "memoryLoad": 8,
          "min": 17,
          "max": 101,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        },
        {
          "sourceId": "10.1371/journal.pone.0101750",
          "locator": "Table 2 (Total errors by memory load and age group), article p. 6",
          "ageLabel": "9–10",
          "n": 46,
          "metric": "total-errors",
          "mean": 68.9,
          "sd": 46.2,
          "percentiles": null,
          "memoryLoad": 10,
          "min": 5,
          "max": 187,
          "unit": "errors across six learning trials",
          "lowerIsBetter": true
        }
      ]
    },
    "applicability": {
      "personalPercentile": false,
      "reason": "Loads, six feedback-rich learning trials, stimuli and 20-minute stopping differ from hanna-picture-place-v1; CC BY covers the paper/table, not a licence to copy Cogstate software or proprietary stimuli."
    }
  },
  {
    "sourceId": "10.3389/fpsyg.2015.01544",
    "citation": "Pelegrina, S. et al. (2015). Normative data on the n-back task for children and young adolescents. Frontiers in Psychology, 6, 1544.",
    "url": "https://doi.org/10.3389/fpsyg.2015.01544",
    "sourceType": "primary-paper",
    "license": {
      "code": "CC-BY",
      "reuse": "data-reuse",
      "evidenceUrl": "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.01544/full"
    },
    "task": {
      "name": "Computerized verbal n-back",
      "version": "E-Prime study task, exact E-Prime/software version not reported",
      "direction": "1-back-2-back-3-back",
      "modality": "computer-visual-keyboard",
      "language": "Instruction language not reported; Spanish school sample; letter stimuli",
      "stoppingRule": "At each level: examples, 20-trial practice (repeat if target accuracy <60%), then two 20-trial test blocks; discontinue if a test block has <60% target accuracy.",
      "scoring": "Hits are correct yes-responses to targets; each level has 40 trials with 30% targets (12 possible hits). Table also reports false alarms, d-prime and RT, but the machine record carries Table 4 hit norms only."
    },
    "sample": {
      "country": "Spain",
      "n": 3722,
      "ageMin": 7,
      "ageMax": 13,
      "inclusion": "School children from 43 schools in several Spanish cities; parental consent; no other exclusion criteria."
    },
    "table": {
      "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
      "values": [
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "7",
          "n": 193,
          "metric": "1-back-hits",
          "mean": 8.05,
          "sd": 3.04,
          "percentiles": {
            "5": 3,
            "25": 6,
            "50": 8,
            "75": 10,
            "95": 13
          },
          "nBack": 1,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "8",
          "n": 285,
          "metric": "1-back-hits",
          "mean": 8.82,
          "sd": 3.09,
          "percentiles": {
            "5": 3,
            "25": 7,
            "50": 9,
            "75": 11,
            "95": 13
          },
          "nBack": 1,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "9",
          "n": 310,
          "metric": "1-back-hits",
          "mean": 9.14,
          "sd": 2.82,
          "percentiles": {
            "5": 4,
            "25": 7,
            "50": 9,
            "75": 11,
            "95": 13
          },
          "nBack": 1,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "10",
          "n": 297,
          "metric": "1-back-hits",
          "mean": 9.72,
          "sd": 2.96,
          "percentiles": {
            "5": 4,
            "25": 8,
            "50": 10,
            "75": 12,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "11",
          "n": 315,
          "metric": "1-back-hits",
          "mean": 10.01,
          "sd": 2.98,
          "percentiles": {
            "5": 4,
            "25": 8,
            "50": 11,
            "75": 12,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "12",
          "n": 253,
          "metric": "1-back-hits",
          "mean": 10.2,
          "sd": 2.96,
          "percentiles": {
            "5": 4,
            "25": 8,
            "50": 11,
            "75": 13,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "13",
          "n": 233,
          "metric": "1-back-hits",
          "mean": 10.28,
          "sd": 2.96,
          "percentiles": {
            "5": 4,
            "25": 9,
            "50": 11,
            "75": 12,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "7",
          "n": 194,
          "metric": "1-back-hits",
          "mean": 8.21,
          "sd": 3.29,
          "percentiles": {
            "5": 2,
            "25": 6,
            "50": 8,
            "75": 11,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "8",
          "n": 307,
          "metric": "1-back-hits",
          "mean": 8.6,
          "sd": 3.09,
          "percentiles": {
            "5": 3,
            "25": 6,
            "50": 9,
            "75": 11,
            "95": 13
          },
          "nBack": 1,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "9",
          "n": 296,
          "metric": "1-back-hits",
          "mean": 9.54,
          "sd": 3.12,
          "percentiles": {
            "5": 4,
            "25": 7,
            "50": 10,
            "75": 12,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "10",
          "n": 321,
          "metric": "1-back-hits",
          "mean": 10.11,
          "sd": 2.86,
          "percentiles": {
            "5": 5,
            "25": 8,
            "50": 11,
            "75": 12,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "11",
          "n": 286,
          "metric": "1-back-hits",
          "mean": 10.41,
          "sd": 2.77,
          "percentiles": {
            "5": 5,
            "25": 9,
            "50": 11,
            "75": 12,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "12",
          "n": 223,
          "metric": "1-back-hits",
          "mean": 10.73,
          "sd": 2.55,
          "percentiles": {
            "5": 6,
            "25": 9,
            "50": 11,
            "75": 13,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "13",
          "n": 209,
          "metric": "1-back-hits",
          "mean": 11.29,
          "sd": 2.34,
          "percentiles": {
            "5": 7,
            "25": 10,
            "50": 12,
            "75": 13,
            "95": 14
          },
          "nBack": 1,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "7",
          "n": 193,
          "metric": "2-back-hits",
          "mean": 4.1,
          "sd": 3.64,
          "percentiles": {
            "50": 4,
            "75": 7,
            "95": 11
          },
          "nBack": 2,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "8",
          "n": 285,
          "metric": "2-back-hits",
          "mean": 5.02,
          "sd": 3.67,
          "percentiles": {
            "25": 2,
            "50": 5,
            "75": 8,
            "95": 11
          },
          "nBack": 2,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "9",
          "n": 310,
          "metric": "2-back-hits",
          "mean": 5.23,
          "sd": 3.81,
          "percentiles": {
            "25": 2,
            "50": 5,
            "75": 8,
            "95": 12
          },
          "nBack": 2,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "10",
          "n": 297,
          "metric": "2-back-hits",
          "mean": 6.29,
          "sd": 3.78,
          "percentiles": {
            "25": 3,
            "50": 6,
            "75": 9,
            "95": 12
          },
          "nBack": 2,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "11",
          "n": 315,
          "metric": "2-back-hits",
          "mean": 6.96,
          "sd": 4.08,
          "percentiles": {
            "25": 4,
            "50": 7,
            "75": 10,
            "95": 13
          },
          "nBack": 2,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "12",
          "n": 253,
          "metric": "2-back-hits",
          "mean": 7.26,
          "sd": 3.91,
          "percentiles": {
            "25": 5,
            "50": 8,
            "75": 11,
            "95": 13
          },
          "nBack": 2,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "13",
          "n": 233,
          "metric": "2-back-hits",
          "mean": 8.16,
          "sd": 3.99,
          "percentiles": {
            "25": 6,
            "50": 9,
            "75": 11,
            "95": 13
          },
          "nBack": 2,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "7",
          "n": 194,
          "metric": "2-back-hits",
          "mean": 3.96,
          "sd": 3.59,
          "percentiles": {
            "50": 3,
            "75": 6,
            "95": 11
          },
          "nBack": 2,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "8",
          "n": 307,
          "metric": "2-back-hits",
          "mean": 4.53,
          "sd": 3.49,
          "percentiles": {
            "25": 1,
            "50": 5,
            "75": 7,
            "95": 10
          },
          "nBack": 2,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "9",
          "n": 296,
          "metric": "2-back-hits",
          "mean": 5.74,
          "sd": 3.76,
          "percentiles": {
            "25": 3,
            "50": 6,
            "75": 9,
            "95": 12
          },
          "nBack": 2,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "10",
          "n": 321,
          "metric": "2-back-hits",
          "mean": 6.52,
          "sd": 3.5,
          "percentiles": {
            "25": 4,
            "50": 7,
            "75": 9,
            "95": 12
          },
          "nBack": 2,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "11",
          "n": 286,
          "metric": "2-back-hits",
          "mean": 7.44,
          "sd": 3.68,
          "percentiles": {
            "25": 5,
            "50": 8,
            "75": 10,
            "95": 13
          },
          "nBack": 2,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "12",
          "n": 223,
          "metric": "2-back-hits",
          "mean": 7.93,
          "sd": 3.77,
          "percentiles": {
            "25": 6,
            "50": 8,
            "75": 11,
            "95": 13
          },
          "nBack": 2,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "13",
          "n": 209,
          "metric": "2-back-hits",
          "mean": 9.11,
          "sd": 3.75,
          "percentiles": {
            "5": 2,
            "25": 7,
            "50": 10,
            "75": 12,
            "95": 14
          },
          "nBack": 2,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "7",
          "n": 193,
          "metric": "3-back-hits",
          "mean": 2.3,
          "sd": 3.41,
          "percentiles": {
            "75": 5,
            "95": 9
          },
          "nBack": 3,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "8",
          "n": 285,
          "metric": "3-back-hits",
          "mean": 2.87,
          "sd": 3.81,
          "percentiles": {
            "75": 6,
            "95": 10
          },
          "nBack": 3,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "9",
          "n": 310,
          "metric": "3-back-hits",
          "mean": 3.26,
          "sd": 3.91,
          "percentiles": {
            "75": 7,
            "95": 11
          },
          "nBack": 3,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "10",
          "n": 297,
          "metric": "3-back-hits",
          "mean": 4.23,
          "sd": 4.15,
          "percentiles": {
            "50": 4,
            "75": 8,
            "95": 11
          },
          "nBack": 3,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "11",
          "n": 315,
          "metric": "3-back-hits",
          "mean": 4.97,
          "sd": 4.27,
          "percentiles": {
            "50": 6,
            "75": 9,
            "95": 11
          },
          "nBack": 3,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "12",
          "n": 253,
          "metric": "3-back-hits",
          "mean": 5.04,
          "sd": 4.12,
          "percentiles": {
            "50": 6,
            "75": 8,
            "95": 11
          },
          "nBack": 3,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "13",
          "n": 233,
          "metric": "3-back-hits",
          "mean": 6.37,
          "sd": 4.27,
          "percentiles": {
            "25": 2,
            "50": 7,
            "75": 10,
            "95": 12
          },
          "nBack": 3,
          "subgroup": {
            "sex": "boys"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "7",
          "n": 194,
          "metric": "3-back-hits",
          "mean": 2.07,
          "sd": 3.46,
          "percentiles": {
            "75": 4,
            "95": 10
          },
          "nBack": 3,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "8",
          "n": 307,
          "metric": "3-back-hits",
          "mean": 2.45,
          "sd": 3.46,
          "percentiles": {
            "75": 5,
            "95": 10
          },
          "nBack": 3,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "9",
          "n": 296,
          "metric": "3-back-hits",
          "mean": 3.41,
          "sd": 3.98,
          "percentiles": {
            "75": 7,
            "95": 10
          },
          "nBack": 3,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "10",
          "n": 321,
          "metric": "3-back-hits",
          "mean": 4.44,
          "sd": 4.24,
          "percentiles": {
            "50": 5,
            "75": 8,
            "95": 11
          },
          "nBack": 3,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "11",
          "n": 286,
          "metric": "3-back-hits",
          "mean": 5.38,
          "sd": 4.28,
          "percentiles": {
            "50": 6,
            "75": 9,
            "95": 12
          },
          "nBack": 3,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "12",
          "n": 223,
          "metric": "3-back-hits",
          "mean": 6.05,
          "sd": 4.36,
          "percentiles": {
            "25": 1,
            "50": 7,
            "75": 10,
            "95": 12
          },
          "nBack": 3,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        },
        {
          "sourceId": "10.3389/fpsyg.2015.01544",
          "locator": "Table 4 (Normative data by age and gender), article pp. 8–9",
          "ageLabel": "13",
          "n": 209,
          "metric": "3-back-hits",
          "mean": 6.8,
          "sd": 4.11,
          "percentiles": {
            "25": 5,
            "50": 8,
            "75": 10,
            "95": 13
          },
          "nBack": 3,
          "subgroup": {
            "sex": "girls"
          },
          "unit": "hits out of 12 target trials"
        }
      ]
    },
    "applicability": {
      "personalPercentile": false,
      "reason": "Letter/keyboard E-Prime protocol, target count, stopping and unreported instruction language do not match the existing Hanna N-back protocol/comparability key."
    }
  },
  {
    "sourceId": "10.3389/fnhum.2024.1304221",
    "citation": "Clifford Jr., J. O. et al. (2024). Episodic memory assessment: effects of sex and age on performance and response time during a continuous recognition task. Frontiers in Human Neuroscience, 18, 1304221.",
    "url": "https://doi.org/10.3389/fnhum.2024.1304221",
    "sourceType": "primary-paper",
    "license": {
      "code": "CC-BY",
      "reuse": "data-reuse",
      "evidenceUrl": "https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2024.1304221/full"
    },
    "task": {
      "name": "HAPPYneuron MemTrax continuous recognition task",
      "version": "HAPPYneuron online implementation, 2011–2013; monthly image sets and four order sets",
      "direction": "old-new continuous recognition",
      "modality": "web-visual-spacebar",
      "language": "not reported",
      "stoppingRule": "Exactly 50 images: 25 new and 25 repeat presentations; up to 3 seconds per image; response advances immediately (minimum 50 ms).",
      "scoring": "HIT = response to repeat at 50–2900 ms; correct rejection = no response to a new image by 3000 ms. Table 1B values are regression-derived age/sex estimates, not raw subgroup means."
    },
    "sample": {
      "country": "Online; geography not reported",
      "n": 18265,
      "ageMin": 21,
      "ageMax": 100,
      "inclusion": "First-time self-selected online users after duplicate, age/date and performance/RT selection; self-report demographics unverified; no clinical characterization."
    },
    "table": {
      "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
      "values": [
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "21–31",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.5,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "21–31",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 24.1,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "31–40",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.5,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "31–40",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 24.1,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "41–51",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.4,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "41–51",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 24.0,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "51–60",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.3,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "51–60",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 23.9,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "61–70",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.2,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "61–70",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 23.8,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "71–81",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.0,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "71–81",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 23.6,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "81–90",
          "n": null,
          "metric": "modeled-hits",
          "mean": 22.8,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "81–90",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 23.4,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "male"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "21–31",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.4,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "21–31",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 24.0,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "31–40",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.4,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "31–40",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 24.0,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "41–51",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.4,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "41–51",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 23.9,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "51–60",
          "n": null,
          "metric": "modeled-hits",
          "mean": 23.2,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "51–60",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 23.8,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "61–70",
          "n": null,
          "metric": "modeled-hits",
          "mean": 22.9,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "61–70",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 23.6,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "71–81",
          "n": null,
          "metric": "modeled-hits",
          "mean": 22.5,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "71–81",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 23.4,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "81–90",
          "n": null,
          "metric": "modeled-hits",
          "mean": 21.9,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct recognitions out of 25 repeats",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        },
        {
          "sourceId": "10.3389/fnhum.2024.1304221",
          "locator": "Table 1B (modeled HITS and CR age/sex reference values), article Results",
          "ageLabel": "81–90",
          "n": null,
          "metric": "modeled-correct-rejections",
          "mean": 23.2,
          "sd": null,
          "percentiles": null,
          "subgroup": {
            "sex": "female"
          },
          "unit": "correct rejections out of 25 new images",
          "estimateType": "quadratic-regression age/sex reference; cell n not tabulated"
        }
      ]
    },
    "applicability": {
      "personalPercentile": false,
      "reason": "Self-selected adult web sample, proprietary monthly image sets, spacebar timing and regression estimates do not match hanna-recognition-v1; age-cell n and raw SD are not tabulated."
    }
  },
  {
    "sourceId": "10.7717/peerj.1460",
    "citation": "Piper, B. J. et al. (2015). Reliability and validity of neurobehavioral function on the Psychology Experimental Building Language test battery in young adults. PeerJ, 3, e1460.",
    "url": "https://doi.org/10.7717/peerj.1460",
    "sourceType": "primary-paper",
    "license": {
      "code": "CC-BY",
      "reuse": "data-reuse",
      "evidenceUrl": "https://peerj.com/articles/1460/"
    },
    "task": {
      "name": "PEBL default Digit Span Forward",
      "version": "PEBL battery 0.6 default with study modifications; modification code linked by article",
      "direction": "forward",
      "modality": "desktop-computer-auditory-and-visual-response-not-clearly-reported",
      "language": "English",
      "stoppingRule": "Starts at length 3, three trials per length; article does not state the terminating rule and the reported task had programming modifications relative to PEBL 0.6 defaults.",
      "scoring": "Number of trials completed correctly; Table 1 reports mean and SEM, not SD."
    },
    "sample": {
      "country": "United States",
      "n": 148,
      "ageMin": 18,
      "ageMax": 22,
      "inclusion": "College students receiving course credit; valid Digit Span records n=148 within Study I N=189."
    },
    "table": {
      "locator": "Table 1, row G (Digit Span points), article p. 9",
      "values": [
        {
          "sourceId": "10.7717/peerj.1460",
          "locator": "Table 1, row G (Digit Span points), article p. 9",
          "ageLabel": "18–22",
          "n": 148,
          "metric": "PEBL-digit-span-forward-points",
          "mean": 13.5,
          "sd": null,
          "percentiles": null,
          "sem": 0.3,
          "min": 7,
          "max": 21,
          "unit": "correct trials"
        }
      ]
    },
    "applicability": {
      "personalPercentile": false,
      "reason": "Young-adult PEBL forward-only points, incomplete stopping documentation and computer presentation do not match hanna-digit-span-v1. CC BY covers the table; PEBL code is separately GPL and assets/protocol provenance must be checked."
    }
  },
  {
    "sourceId": "10.1093/arclin/acag010",
    "citation": "Ball, K. et al. (2026). Cambridge Neuropsychological Test Automated Battery (CANTAB) and Cogstate Normative Data of Australian 12- and 13-Year-Olds. Archives of Clinical Neuropsychology, 41(3), acag010.",
    "url": "https://academic.oup.com/acn/article/41/3/acag010/8501228",
    "sourceType": "primary-paper",
    "license": {
      "code": "publisher-all-rights-reserved",
      "reuse": "link-only",
      "evidenceUrl": "https://academic.oup.com/acn/article/41/3/acag010/8501228"
    },
    "task": {
      "name": "CANTAB PAL and Cogstate One-/Two-Back",
      "version": "CANTAB and Cogstate versions not reported in accessible article text",
      "direction": "paired-associate-learning-and-n-back",
      "modality": "CANTAB iPad touch; Cogstate desktop keyboard",
      "language": "English",
      "stoppingRule": "Vendor-controlled automated procedures; exact stopping rules are not fully reported in the accessible article text.",
      "scoring": "Table 2 reports values in the transformed format automatically provided by CANTAB/Cogstate; supplementary material defines calculations but is subscriber-only."
    },
    "sample": {
      "country": "Australia",
      "n": 120,
      "ageMin": 12,
      "ageMax": 13,
      "inclusion": "Community sample with sufficient English; CANTAB PAL n=97 and Cogstate measures n=116–119 after task-specific cleaning; comparatively advantaged socioeconomic profile."
    },
    "table": {
      "locator": "Table 2, rows Paired Associates Learning, One-Back and Two-Back",
      "values": [
        {
          "sourceId": "10.1093/arclin/acag010",
          "locator": "Table 2, rows Paired Associates Learning, One-Back and Two-Back",
          "ageLabel": "12",
          "n": 38,
          "metric": "CANTAB-PAL-first-attempt-memory-score",
          "mean": 15.53,
          "sd": 2.9,
          "percentiles": null,
          "median": 16,
          "min": 10,
          "max": 20,
          "unit": "vendor-transformed score"
        },
        {
          "sourceId": "10.1093/arclin/acag010",
          "locator": "Table 2, rows Paired Associates Learning, One-Back and Two-Back",
          "ageLabel": "12",
          "n": 38,
          "metric": "CANTAB-PAL-total-errors-adjusted",
          "mean": 6.26,
          "sd": 4.75,
          "percentiles": null,
          "median": 6,
          "min": 0,
          "max": 18,
          "unit": "vendor-transformed score"
        },
        {
          "sourceId": "10.1093/arclin/acag010",
          "locator": "Table 2, rows Paired Associates Learning, One-Back and Two-Back",
          "ageLabel": "13",
          "n": 59,
          "metric": "CANTAB-PAL-first-attempt-memory-score",
          "mean": 15.15,
          "sd": 3.34,
          "percentiles": null,
          "median": 15,
          "min": 5,
          "max": 20,
          "unit": "vendor-transformed score"
        },
        {
          "sourceId": "10.1093/arclin/acag010",
          "locator": "Table 2, rows Paired Associates Learning, One-Back and Two-Back",
          "ageLabel": "13",
          "n": 59,
          "metric": "CANTAB-PAL-total-errors-adjusted",
          "mean": 7.39,
          "sd": 7.39,
          "percentiles": null,
          "median": 6,
          "min": 0,
          "max": 43,
          "unit": "vendor-transformed score"
        },
        {
          "sourceId": "10.1093/arclin/acag010",
          "locator": "Table 2, rows Paired Associates Learning, One-Back and Two-Back",
          "ageLabel": "12",
          "n": 82,
          "metric": "Cogstate-One-Back-accuracy",
          "mean": 1.29,
          "sd": 0.12,
          "percentiles": null,
          "median": 1.32,
          "min": 1.01,
          "max": 1.57,
          "unit": "vendor-transformed accuracy"
        },
        {
          "sourceId": "10.1093/arclin/acag010",
          "locator": "Table 2, rows Paired Associates Learning, One-Back and Two-Back",
          "ageLabel": "12",
          "n": 79,
          "metric": "Cogstate-Two-Back-accuracy",
          "mean": 1.27,
          "sd": 0.15,
          "percentiles": null,
          "median": 1.27,
          "min": 0.91,
          "max": 1.57,
          "unit": "vendor-transformed accuracy"
        },
        {
          "sourceId": "10.1093/arclin/acag010",
          "locator": "Table 2, rows Paired Associates Learning, One-Back and Two-Back",
          "ageLabel": "13",
          "n": 37,
          "metric": "Cogstate-One-Back-accuracy",
          "mean": 1.36,
          "sd": 0.13,
          "percentiles": null,
          "median": 1.39,
          "min": 1.01,
          "max": 1.57,
          "unit": "vendor-transformed accuracy"
        },
        {
          "sourceId": "10.1093/arclin/acag010",
          "locator": "Table 2, rows Paired Associates Learning, One-Back and Two-Back",
          "ageLabel": "13",
          "n": 37,
          "metric": "Cogstate-Two-Back-accuracy",
          "mean": 1.23,
          "sd": 0.1,
          "percentiles": null,
          "median": 1.23,
          "min": 1.04,
          "max": 1.4,
          "unit": "vendor-transformed accuracy"
        }
      ]
    },
    "applicability": {
      "personalPercentile": false,
      "reason": "Proprietary task versions, vendor transformations, devices and exact stopping rules do not match Hanna protocols; publisher table is recorded link-only."
    }
  }
];

export default cognitiveReferenceData;
