import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useAuth } from '../state/useAuth';
import { useGacha } from '../state/useGacha';

export default function LoginScreen() {
  const { user, loading, signIn, signUp, hydrate } = useAuth();
  const { hydrate: hydrateGacha } = useGacha();
  const [mode, setMode] = useState<'signin'|'signup'>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => { hydrate(); hydrateGacha(); }, []);

  async function onSubmit() {
    try {
      if (mode === 'signup') await signUp(email.trim(), password, username.trim() || undefined);
      else await signIn(email.trim(), password);
    } catch (e:any) {
      Alert.alert('Auth error', e.message ?? String(e));
    }
  }

  if (loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Loading…</Text></View>;
  if (user) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Already signed in as {user.username ?? user.email}</Text></View>;

  return (
    <View style={{ flex:1, padding:16, gap:12, justifyContent:'center' }}>
      <Text accessibilityRole="header" style={{ fontSize:24, fontWeight:'700', marginBottom:8 }}>
        {mode === 'signup' ? 'Create account' : 'Sign in'}
      </Text>

      {mode === 'signup' && (
        <>
          <Text>Username (optional)</Text>
          <TextInput value={username} onChangeText={setUsername}
            placeholder="Skyeler"
            accessibilityLabel="Username"
            style={{ borderWidth:1, padding:12, borderRadius:8 }} />
        </>
      )}

      <Text>Email</Text>
      <TextInput value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none"
        accessibilityLabel="Email"
        style={{ borderWidth:1, padding:12, borderRadius:8 }} />

      <Text>Password</Text>
      <TextInput value={password} onChangeText={setPassword}
        secureTextEntry accessibilityLabel="Password"
        style={{ borderWidth:1, padding:12, borderRadius:8 }} />

      <Pressable onPress={onSubmit}
        accessibilityRole="button"
        style={{ marginTop:8, padding:14, backgroundColor:'#111', borderRadius:10 }}>
        <Text style={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </Text>
      </Pressable>

      <Pressable onPress={() => setMode(mode==='signup'?'signin':'signup')} style={{ padding:8 }}>
        <Text style={{ textAlign:'center' }}>
          {mode==='signup' ? 'Have an account? Sign in' : 'New here? Create account'}
        </Text>
      </Pressable>
    </View>
  );
}
