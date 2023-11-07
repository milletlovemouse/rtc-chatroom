import { Ref } from "vue";

function speechRecognition(ref: Ref) {
  var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition

  var recognition = new SpeechRecognition() as SpeechRecognition;
  recognition.continuous = true;
  recognition.lang = 'zh-CN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = function(event) {
    console.log('onresult', event);
    const index = event.resultIndex;
    const value = event.results[index][0].transcript
    if (Array.isArray(ref.value)) {
      ref.value.push(value)
    } else {
      ref.value = value
    }
  }

  recognition.onerror = function(event) {
    console.error('onerror', event);
  }

  recognition.onend = function(event) {
    console.log('onend', event);
    recognition.start();
  }
  recognition.start();
}

export default speechRecognition;