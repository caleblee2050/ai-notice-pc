import React, { useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Platform } from 'react-native';
import Voice from '@react-native-community/voice';
import DocumentGeneratorComponent from './DocumentGeneratorComponent';

/**
 * @description Voice Recording Component for one-click recording and continuous transcription.
 * @returns {JSX.Element} Recording UI with start/stop buttons and transcribed text display.
 */
const RecordingComponent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onstart = () => setIsRecording(true);
        recog.onend = () => setIsRecording(false);
        recog.onerror = (e) => console.log('Web Speech Error: ', e.error);
        recog.onresult = (e) => {
          if (e.results.length > 0) {
            setTranscribedText(e.results[e.results.length - 1][0].transcript);
          }
        };

        setRecognition(recog);
      } else {
        console.log('Web Speech API not supported');
      }
    } else {
      Voice.onSpeechStart = () => setIsRecording(true);
      Voice.onSpeechEnd = () => setIsRecording(false);
      Voice.onSpeechError = (e) => console.log('Error: ', e.error);
      Voice.onSpeechResults = (e) => setTranscribedText(e.value[0]);

      return () => {
        Voice.destroy().then(Voice.removeAllListeners);
      };
    }
  }, []);

  const startRecording = () => {
    if (Platform.OS === 'web') {
      if (recognition) {
        recognition.start();
      }
    } else {
      Voice.start('en-US').catch(e => console.error(e));
    }
  };

  const stopRecording = () => {
    if (Platform.OS === 'web') {
      if (recognition) {
        recognition.stop();
      }
    } else {
      Voice.stop().catch(e => console.error(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>음성 녹음</Text>
      <View style={styles.buttonContainer}>
        <Button 
          title={isRecording ? '녹음 중...' : '녹음 시작'} 
          onPress={startRecording} 
          disabled={isRecording} 
        />
        <Button 
          title="녹음 중지" 
          onPress={stopRecording} 
          disabled={!isRecording} 
        />
      </View>
      <View style={styles.transcriptionContainer}>
        <Text style={styles.label}>변환된 텍스트:</Text>
        <Text style={styles.transcribedText}>{transcribedText || '녹음을 시작하면 여기에 텍스트가 표시됩니다.'}</Text>
      </View>
      <DocumentGeneratorComponent transcribedText={transcribedText} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  transcriptionContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#555',
  },
  transcribedText: {
    fontSize: 16,
    color: '#333',
    minHeight: 60,
  },
});

export default RecordingComponent;