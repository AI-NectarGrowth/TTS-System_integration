# Speaker Diarization Setup

## Overview
The application now includes speaker diarization to detect and separate conversations between Doctor and Patient.

## How It Works

1. **Audio Processing**: When you upload an audio file with multiple speakers
2. **Transcription**: OpenAI Whisper converts speech to text
3. **Diarization**: pyannote.audio identifies who spoke when
4. **Display**: Conversation shown in chat-like bubbles with speaker labels

## Setup Instructions

### Required Dependencies
```bash
pip install pyannote.audio torch torchaudio pydub
```

### Optional: HuggingFace Token (Recommended)
For better diarization accuracy, get a token from https://huggingface.co/settings/tokens

Add to your `.env` file:
```
HUGGINGFACE_TOKEN=your_token_here
```

### Basic Mode
Without HuggingFace token, the system uses a simple alternating speaker heuristic:
- Assumes speakers alternate between segments
- Labels them as Doctor/Patient

### Advanced Mode (with HuggingFace token)
- Uses AI model to accurately detect speaker changes
- Maps SPEAKER_00 → Doctor
- Maps SPEAKER_01 → Patient
- More accurate for complex conversations

## Features

### Visual Distinction
- **Doctor** (green bubble, left-aligned)
- **Patient** (cream bubble, right-aligned)
- Timestamps for each turn
- Speaker icons (🩺 doctor, 👤 patient)

### API Response Format
```json
{
  "success": true,
  "text": "full transcription",
  "conversation": [
    {
      "speaker": "Doctor",
      "text": "How are you feeling today?",
      "start": 0.5,
      "end": 2.3
    },
    {
      "speaker": "Patient",
      "text": "I've been having headaches.",
      "start": 2.8,
      "end": 4.5
    }
  ],
  "diarization_available": true
}
```

## Testing

1. Record or upload a conversation with two people
2. Click "Transcribe to Text"
3. View the conversation tab
4. Each speaker's text appears in separate bubbles
5. Check the "Diarization" badge for mode (Active/Basic)

## Troubleshooting

### Diarization Not Working
- Check if pyannote.audio is installed
- Verify HuggingFace token is valid
- Check console logs for errors

### Poor Speaker Detection
- Audio quality matters - use clear recordings
- Minimize background noise
- Ensure speakers don't overlap too much
- Consider adding HuggingFace token for better accuracy

### Speaker Labels Wrong
- The system labels first speaker as "Doctor", second as "Patient"
- For different use cases, modify the mapping in server.py:
  ```python
  if speaker == "SPEAKER_00":
      speaker_name = "Speaker 1"  # Change here
  elif speaker == "SPEAKER_01":
      speaker_name = "Speaker 2"  # Change here
  ```

## Performance Notes

- First run may be slower (model download)
- Processing time increases with audio length
- GPU acceleration supported if available
- Typical: 5-10 seconds for 1 minute of audio

## Privacy

- All processing happens on your server
- Audio files are temporarily stored then deleted
- No data sent to third parties (except OpenAI for transcription)
