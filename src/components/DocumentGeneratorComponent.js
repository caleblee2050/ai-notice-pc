import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet } from 'react-native';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as SMS from 'expo-sms';
import { GEMINI_API_KEY } from '@env';

const DocumentGeneratorComponent = ({ transcribedText }) => {
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [editedDocument, setEditedDocument] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [documentType, setDocumentType] = useState('보고서'); // 기본 문서 유형
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const generateDocument = async () => {
    if (!transcribedText) {
      setError('음성 텍스트가 없습니다. 먼저 음성을 녹음해주세요.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'YOUR_API_KEY_HERE');
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `사용자가 말한 내용을 바탕으로 ${documentType} 형식의 문서를 작성하세요. 내용은 다음과 같습니다: ${transcribedText}. 문서는 명확하고 구조화되게 작성하세요.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setGeneratedDocument(text);
      setEditedDocument(text); // 초기 편집 텍스트 설정
    } catch (error) {
      console.error('문서 생성 오류:', error);
      setError('문서 생성 중 오류가 발생했습니다: ' + error.message);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>문서 생성기</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          value={documentType}
          onChangeText={setDocumentType}
          placeholder="문서 유형 (예: 보고서, 메모)"
          style={styles.input}
        />
        <Button 
          title={isGenerating ? "생성 중..." : "문서 생성"} 
          onPress={generateDocument}
          disabled={isGenerating || !transcribedText}
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