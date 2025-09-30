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
  const [errorMessage, setErrorMessage] = useState('');
  const [recordingHistory, setRecordingHistory] = useState([]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'ko-KR'; // 한글 인식을 위해 변경

        recog.onstart = () => setIsRecording(true);
        recog.onend = () => {
          setIsRecording(false);
          // 녹음이 끝나면 기록에 추가
          if (transcribedText.trim()) {
            setRecordingHistory(prev => [...prev, {
              id: Date.now(),
              text: transcribedText,
              timestamp: new Date().toLocaleString()
            }]);
          }
        };
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
      Voice.onSpeechEnd = () => {
        setIsRecording(false);
        // 녹음이 끝나면 기록에 추가
        if (transcribedText.trim()) {
          setRecordingHistory(prev => [...prev, {
            id: Date.now(),
            text: transcribedText,
            timestamp: new Date().toLocaleString()
          }]);
        }
      };
      Voice.onSpeechError = (e) => console.log('Error: ', e.error);
      Voice.onSpeechResults = (e) => setTranscribedText(e.value[0]);

      return () => {
        Voice.destroy().then(Voice.removeAllListeners);
      };
    }
  }, [transcribedText]);

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      if (recognition) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          recognition.start();
        } catch (error) {
          setErrorMessage('마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
          console.error('Microphone permission error:', error);
        }
      }
    } else {
      Voice.start('ko-KR').catch(e => { // 한글 인식을 위해 변경
        setErrorMessage('녹음 시작 오류: ' + e.message);
        console.error(e);
      });
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
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
      
      {recordingHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.label}>녹음 기록:</Text>
          {recordingHistory.map(item => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.historyTimestamp}>{item.timestamp}</Text>
              <Text style={styles.historyText}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}
      
      <DocumentGeneratorComponent transcribedText={transcribedText} recordingHistory={recordingHistory} />
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
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  historyContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  historyItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyTimestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyText: {
    fontSize: 14,
    color: '#333',
  },
});

export default RecordingComponent;