import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as SMS from 'expo-sms';

const DocumentGeneratorComponent = ({ transcribedText, recordingHistory = [] }) => {
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [editedDocument, setEditedDocument] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [documentType, setDocumentType] = useState('보고서'); // 기본 문서 유형
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecording, setSelectedRecording] = useState(null);

  /**
   * 문서 생성: 서버 프록시(백엔드)로 텍스트를 보내 구조화된 한국어 문서를 생성합니다.
   * @param {string} [text=transcribedText] - 문서 생성에 사용할 원문 텍스트
   * @returns {Promise<void>} 생성 결과는 상태로 관리됩니다.
   * @example
   * // 프런트엔드에서 호출
   * await generateDocument('회의 내용 요약 텍스트');
   */
  const generateDocument = async (text = transcribedText) => {
    if (!text) {
      setError('음성 텍스트가 없습니다. 먼저 음성을 녹음해주세요.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const res = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, documentType }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '문서 생성 요청 실패');
      }

      const generatedText = data?.content || '';
      setGeneratedDocument(generatedText);
      setEditedDocument(generatedText); // 초기 편집 텍스트 설정
    } catch (error) {
      console.error('문서 생성 오류:', error);
      const msg = error?.message || '알 수 없는 오류';
      setError('문서 생성 중 오류가 발생했습니다: ' + msg);
      setGeneratedDocument('');
      setEditedDocument('');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendSMS = async () => {
    if (!editedDocument) {
      setError('전송할 문서가 없습니다.');
      return;
    }
    
    if (!phoneNumber) {
      setError('전화번호를 입력해주세요.');
      return;
    }
    
    setError('');
    
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const { result } = await SMS.sendSMSAsync(phoneNumber, editedDocument);
        if (result === 'sent' || result === 'cancelled') {
          console.log('SMS 결과:', result);
        }
      } else {
        setError('이 기기에서는 SMS를 사용할 수 없습니다.');
      }
    } catch (error) {
      console.error('SMS 전송 오류:', error);
      setError('SMS 전송 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const selectRecordingForDocument = (recording) => {
    setSelectedRecording(recording);
    generateDocument(recording.text);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>문서 생성기</Text>
      
      {recordingHistory.length > 0 && (
        <View style={styles.recordingsContainer}>
          <Text style={styles.subtitle}>저장된 녹음 기록에서 선택:</Text>
          <ScrollView horizontal style={styles.recordingsScroll}>
            {recordingHistory.map((recording) => (
              <TouchableOpacity 
                key={recording.id} 
                style={[
                  styles.recordingItem, 
                  selectedRecording?.id === recording.id && styles.selectedRecording
                ]}
                onPress={() => selectRecordingForDocument(recording)}
              >
                <Text style={styles.recordingTime}>{recording.timestamp}</Text>
                <Text style={styles.recordingPreview}>
                  {recording.text.length > 30 
                    ? recording.text.substring(0, 30) + '...' 
                    : recording.text}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          value={documentType}
          onChangeText={setDocumentType}
          placeholder="문서 유형 (예: 보고서, 메모)"
          style={styles.input}
        />
        <Button 
          title={isGenerating ? "생성 중..." : "문서 생성"} 
          onPress={() => generateDocument()}
          disabled={isGenerating || (!transcribedText && !selectedRecording)}
        />
      </View>
      
      <TextInput
        multiline
        value={editedDocument}
        onChangeText={setEditedDocument}
        placeholder="여기에 생성된 문서가 표시됩니다."
        style={styles.documentInput}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="전화번호 입력"
          keyboardType="phone-pad"
          style={styles.input}
        />
        <Button 
          title="SMS 전송" 
          onPress={sendSMS}
          disabled={!editedDocument || !phoneNumber}
        />
      </View>
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#555',
  },
  recordingsContainer: {
    marginBottom: 16,
  },
  recordingsScroll: {
    flexDirection: 'row',
    maxHeight: 100,
  },
  recordingItem: {
    padding: 10,
    backgroundColor: '#e6f7ff',
    borderRadius: 6,
    marginRight: 10,
    width: 150,
    borderWidth: 1,
    borderColor: '#d1e8ff',
  },
  selectedRecording: {
    backgroundColor: '#bae7ff',
    borderColor: '#1890ff',
  },
  recordingTime: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  recordingPreview: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  documentInput: {
    height: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  errorText: {
    color: 'red',
    marginTop: 8,
  },
});

export default DocumentGeneratorComponent;