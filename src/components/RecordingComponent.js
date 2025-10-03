import React, { useState, useEffect, useRef } from 'react';
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
  const lastFinalIndexRef = useRef(0); // 웹 onresult에서 처리한 마지막 final 인덱스
  const accumulatedFinalRef = useRef(''); // 최종 확정된 텍스트 누적
  const currentSessionIdRef = useRef(null); // 진행 중 세션 ID

  useEffect(() => {
    if (Platform.OS === 'web') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'ko-KR'; // 한글 인식을 위해 변경

        recog.onstart = () => {
          setIsRecording(true);
          lastFinalIndexRef.current = 0;
          accumulatedFinalRef.current = '';
          setTranscribedText('');
          // 새 세션을 기록에 추가
          const newId = Date.now();
          currentSessionIdRef.current = newId;
          setRecordingHistory((prev) => [
            ...prev,
            {
              id: newId,
              text: '',
              timestamp: new Date().toLocaleString(),
            },
          ]);
        };
        recog.onend = () => {
          setIsRecording(false);
          // 세션 종료
          currentSessionIdRef.current = null;
        };
        recog.onerror = (e) => {
          console.log('Web Speech Error: ', e.error);
          setErrorMessage('음성 인식 오류: ' + e.error);
        };
        recog.onresult = (e) => {
          // Web Speech API에서는 interim(임시)과 final(최종) 결과가 섞여 들어옵니다.
          // 이전에 처리한 최종 인덱스 이후의 최종 결과만 누적하여 중복을 방지합니다.
          try {
            let appended = '';
            for (let i = lastFinalIndexRef.current; i < e.results.length; i++) {
              const res = e.results[i];
              if (res.isFinal) {
                const chunk = res[0]?.transcript || '';
                appended += (appended ? ' ' : '') + chunk;
                lastFinalIndexRef.current = i + 1; // 다음 루프에서 이 인덱스 이후만 처리
              }
            }
            if (appended) {
              accumulatedFinalRef.current = accumulatedFinalRef.current
                ? `${accumulatedFinalRef.current} ${appended}`
                : appended;
              console.log('누적 최종 텍스트 추가:', appended);
            }

            // 화면에는 현재까지의 최종 누적 + 최신 임시 결과를 함께 보여줘서
            // 중지 전까지 모든 내용이 연속적으로 보이도록 처리
            const latest = e.results[e.results.length - 1];
            const interim = !latest.isFinal ? latest[0]?.transcript || '' : '';
            const display = [accumulatedFinalRef.current, interim].filter(Boolean).join(' ').trim();
            setTranscribedText(display);
            // 진행 중 세션 기록을 실시간 업데이트
            const sid = currentSessionIdRef.current;
            if (sid) {
              setRecordingHistory((prev) =>
                prev.map((r) => (r.id === sid ? { ...r, text: display } : r))
              );
            }
          } catch (err) {
            console.log('onresult 처리 오류:', err);
          }
        };

        setRecognition(recog);
      } else {
        console.log('Web Speech API not supported');
        setErrorMessage('이 브라우저는 음성 인식을 지원하지 않습니다.');
      }
    } else {
      Voice.onSpeechStart = () => {
        setIsRecording(true);
        setTranscribedText('');
        accumulatedFinalRef.current = '';
        const newId = Date.now();
        currentSessionIdRef.current = newId;
        setRecordingHistory((prev) => [
          ...prev,
          {
            id: newId,
            text: '',
            timestamp: new Date().toLocaleString(),
          },
        ]);
      };
      Voice.onSpeechEnd = () => {
        setIsRecording(false);
        currentSessionIdRef.current = null;
      };
      Voice.onSpeechError = (e) => {
        console.log('Error: ', e.error);
        setErrorMessage('음성 인식 오류: ' + e.error);
      };
      Voice.onSpeechPartialResults = (e) => {
        // 부분 결과는 화면에 보여주되, 최종 결과에서만 본문에 합산하도록 옵션 처리 필요 시 확장 가능
        // 현재는 부분 결과를 즉시 누적하여 사용성을 높임
        if (e.value && e.value.length > 0) {
          const chunk = e.value.join(' ');
          setTranscribedText((prevText) => {
            const updated = prevText ? `${prevText} ${chunk}` : chunk;
            const sid = currentSessionIdRef.current;
            if (sid) {
              setRecordingHistory((prevHist) =>
                prevHist.map((r) => (r.id === sid ? { ...r, text: updated } : r))
              );
            }
            return updated;
          });
        }
      };
      Voice.onSpeechResults = (e) => {
        // 최종 결과도 누적하여 안정적으로 반영
        if (e.value && e.value.length > 0) {
          const chunk = e.value.join(' ');
          setTranscribedText((prevText) => {
            const updated = prevText ? `${prevText} ${chunk}` : chunk;
            console.log('최종 인식 텍스트:', chunk);
            const sid = currentSessionIdRef.current;
            if (sid) {
              setRecordingHistory((prevHist) =>
                prevHist.map((r) => (r.id === sid ? { ...r, text: updated } : r))
              );
            }
            return updated;
          });
        }
      };

      return () => {
        Voice.destroy().then(Voice.removeAllListeners);
      };
    }
  }, []); // 빈 배열로 한 번만 실행

  const startRecording = async () => {
    setTranscribedText(''); // 새 녹음 세션 시작 시 텍스트 초기화
    setErrorMessage('');
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