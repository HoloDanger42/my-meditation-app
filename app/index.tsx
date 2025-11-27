import React, { useState } from "react";
import { View, Text, Switch, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTriageRecorder } from "../hooks/useTriageRecorder";
import { useTriageAnimations } from "../hooks/useTriageAnimations";
import { TriageButton } from "../components/TriageButton";
import { ResultCard } from "../components/ResultCard";
import { getTriageColors } from "../utils/triageColors";

export default function TriageScreen() {
  const { theme, isDark } = useTheme();
  const [highContrast, setHighContrast] = useState(false);
  const router = useRouter();

  const { status, lastResult, startRecording, stopRecording } =
    useTriageRecorder();
  const { pulseAnim, fadeAnim } = useTriageAnimations(status, lastResult);
  const colors = getTriageColors(theme, highContrast);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark || highContrast ? "light" : "dark"} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
          justifyContent: "space-between",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: "800",
              marginTop: 40,
              marginBottom: 8,
              letterSpacing: -0.5,
            }}
          >
            Voice-First Clinical Triage
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              opacity: 0.7,
              lineHeight: 22,
            }}
          >
            Hold the button and describe your symptoms. Our AI will analyze and
            route you to the appropriate specialist.
          </Text>
        </View>

        {/* Center Button */}
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 40,
          }}
        >
          <TriageButton
            status={status}
            colors={colors}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            pulseAnim={pulseAnim}
          />
        </View>

        {/* Bottom Section */}
        <View style={{ gap: 16 }}>
          {/* Test Upload Button (Temporary - Delete after Day 2) */}
          <Pressable
            onPress={() => router.push('/(other)/test-upload')}
            style={{
              backgroundColor: '#FF6B6B',
              padding: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <Ionicons name="flask" size={24} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              🧪 Test Upload Pipeline
            </Text>
          </Pressable>

          {/* High Contrast Toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.card,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Ionicons name="contrast" size={24} color={colors.text} />
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
              >
                High-Contrast Mode
              </Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              thumbColor={highContrast ? "#FFD400" : undefined}
              trackColor={{ true: "#FFD400" }}
            />
          </View>

          {/* Result Card */}
          {lastResult && (
            <ResultCard
              result={lastResult}
              colors={colors}
              fadeAnim={fadeAnim}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
