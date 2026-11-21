import { addDays, format } from 'date-fns';
import { toInputDate, toInputTime } from './dateUtils.js';

/**
 * Check if Web Speech API is supported
 */
export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && 
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Initialize Speech Recognition instance
 */
export function createSpeechRecognizer({ onResult, onError, onEnd, lang = 'en-IN' }) {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = lang;

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (onResult) {
      onResult({
        final: finalTranscript.trim(),
        interim: interimTranscript.trim(),
        text: (finalTranscript || interimTranscript).trim()
      });
    }
  };

  recognition.onerror = (event) => {
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}

/**
 * Intelligent natural language parser for spoken taxi booking phrases
 * Examples:
 * "My name is Rajesh, phone 9876543210, from Airport to Bandra tomorrow at 10 AM to 1 PM"
 */
export function parseSpeechBooking(text) {
  if (!text || typeof text !== 'string') return {};

  const cleanText = text.trim();
  const parsed = {};
  const today = new Date();

  // 1. Phone Number Detection (10 consecutive digits, optionally with spaces or +91)
  const phoneMatch = cleanText.match(/(?:\+91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})/i) || cleanText.match(/\b\d{10}\b/);
  if (phoneMatch) {
    parsed.customerPhone = phoneMatch[0].replace(/[\s-]/g, '');
  }

  // 2. Customer Name Detection
  const namePatterns = [
    /(?:my name is|name is|i am|this is|myself)\s+([a-zA-Z\s]{2,30}?)(?=[,.]?\s+(?:phone|mobile|number|from|pickup|to|drop|today|tomorrow|\d))/i,
    /(?:customer|passenger)\s+([a-zA-Z\s]{2,30}?)(?=[,.]?\s+(?:phone|from|to|today|tomorrow|\d))/i
  ];
  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      parsed.customerName = match[1].trim();
      break;
    }
  }

  // 3. Pickup and Drop Locations
  // "from [Pickup] to [Drop]"
  const fromToMatch = cleanText.match(/(?:from|pickup\s+from|pickup)\s+([^,]+?)\s+(?:to|drop\s+to|drop\s+at|drop|destination)\s+([^,]+?)(?=\s+(?:tomorrow|today|at|on|\d{1,2}|phone|my|\.|$))/i);
  if (fromToMatch) {
    parsed.pickupLocation = fromToMatch[1].replace(/^(?:from|pickup)\s+/i, '').trim();
    parsed.dropLocation = fromToMatch[2].replace(/^(?:to|drop)\s+/i, '').trim();
  } else {
    // Isolated pickup
    const pickupMatch = cleanText.match(/(?:from|pickup\s+from|pickup)\s+([^,]+?)(?=\s+(?:to|drop|tomorrow|today|at|\d|\.|$))/i);
    if (pickupMatch) parsed.pickupLocation = pickupMatch[1].trim();

    // Isolated drop
    const dropMatch = cleanText.match(/(?:to|drop\s+to|drop\s+at|drop|destination)\s+([^,]+?)(?=\s+(?:from|pickup|tomorrow|today|at|\d|\.|$))/i);
    if (dropMatch) parsed.dropLocation = dropMatch[1].trim();
  }

  // 4. Date Detection
  let targetDate = today;
  if (/\btomorrow\b/i.test(cleanText)) {
    targetDate = addDays(today, 1);
  } else if (/\bday after tomorrow\b/i.test(cleanText)) {
    targetDate = addDays(today, 2);
  }
  parsed.startDate = toInputDate(targetDate);
  parsed.endDate = toInputDate(targetDate);

  // 5. Time Extraction
  // Look for times like "10 AM", "10:30 PM", "4 o'clock", "14:00"
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|o'clock)?\b/gi;
  const timeMatches = [];
  let match;
  while ((match = timeRegex.exec(cleanText)) !== null) {
    const rawHour = parseInt(match[1], 10);
    const rawMin = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3] ? match[3].toLowerCase() : null;

    // Filter out phone numbers or 4-digit years from being mistaken as hours
    if (rawHour > 24) continue;
    if (match.index > 0 && /\d/.test(cleanText[match.index - 1])) continue;

    let hour = rawHour;
    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;

    // Default to morning/afternoon heuristics if meridian omitted
    if (!meridian && hour >= 1 && hour <= 7) {
      // Heuristic: "between 1 to 5" usually means PM for taxi bookings
      hour += 12;
    }

    const formattedTime = `${String(hour).padStart(2, '0')}:${String(rawMin).padStart(2, '0')}`;
    timeMatches.push(formattedTime);
  }

  if (timeMatches.length >= 1) {
    parsed.startTime = timeMatches[0];
    if (timeMatches.length >= 2) {
      parsed.endTime = timeMatches[1];
    } else {
      // Default end time = start time + 2 hours
      const [h, m] = parsed.startTime.split(':').map(Number);
      const endH = (h + 2) % 24;
      parsed.endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // 6. Notes (anything else or full transcript as fallback notes)
  parsed.notes = cleanText;

  return parsed;
}
