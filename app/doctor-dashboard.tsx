import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface PatientCard {
  id: string;
  name: string;
  age: number;
  urgency: "Highly Urgent" | "Urgent" | "Normal";
  timestamp: string;
  specialties: string[];
}

export default function ProviderDashboard() {
  const { theme, isDark } = useTheme();
  const [isAvailable, setIsAvailable] = useState(true);

  // Mock data - replace with actual data from your backend
  const patientQueue: PatientCard[] = [
    {
      id: "1",
      name: "Maria Santos",
      age: 42,
      urgency: "Highly Urgent",
      timestamp: "10 secs ago",
      specialties: ["Neurological", "Neurologist"],
    },
    {
      id: "2",
      name: "Maria Santos",
      age: 42,
      urgency: "Highly Urgent",
      timestamp: "10 secs ago",
      specialties: ["Neurological", "Neurologist"],
    },
    {
      id: "3",
      name: "Maria Santos",
      age: 42,
      urgency: "Highly Urgent",
      timestamp: "10 secs ago",
      specialties: ["Neurological", "Neurologist"],
    },
    {
      id: "4",
      name: "Maria Santos",
      age: 42,
      urgency: "Highly Urgent",
      timestamp: "10 secs ago",
      specialties: ["Neurological", "Neurologist"],
    },
  ];

  const providerInfo = {
    name: "Jose Rizal",
    specialty: "Neurologist",
    avatar: null, // Replace with actual avatar URI
    notificationCount: 0,
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Highly Urgent":
        return "#FF6B6B";
      case "Urgent":
        return "#FFA500";
      default:
        return "#4CAF50";
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f5f5f5",
    },
    gradient: {
      paddingTop: 60,
      paddingBottom: 40,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 30,
    },
    providerInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "#fff",
      marginRight: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#8B5CF6",
    },
    providerDetails: {
      justifyContent: "center",
    },
    providerName: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#1a1a1a",
      marginBottom: 2,
    },
    providerSpecialty: {
      fontSize: 14,
      color: "#4a4a4a",
    },
    notificationBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#fff",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    notificationDot: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#8B5CF6",
    },
    welcomeSection: {
      marginBottom: 24,
    },
    welcomeTitle: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#1a1a1a",
      marginBottom: 4,
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: "#4a4a4a",
    },
    availabilityCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    availabilityLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    availabilityDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#4CAF50",
      marginRight: 10,
    },
    availabilityText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1a1a1a",
    },
    switchContainer: {
      transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
    },
    sortBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    sortButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    sortIcon: {
      marginRight: 8,
    },
    sortText: {
      fontSize: 14,
      color: "#666",
      fontWeight: "500",
    },
    queueContainer: {
      flex: 1,
      paddingHorizontal: 20,
    },
    patientCard: {
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    urgencyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    urgencyBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    urgencyIcon: {
      marginRight: 6,
    },
    urgencyText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#fff",
    },
    timestamp: {
      fontSize: 12,
      color: "#999",
    },
    patientName: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#1a1a1a",
      marginBottom: 4,
    },
    patientAge: {
      fontSize: 14,
      color: "#666",
      marginBottom: 12,
    },
    specialtyRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    specialtyBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 4,
    },
    specialtyIcon: {
      marginRight: 6,
    },
    specialtyText: {
      fontSize: 13,
      fontWeight: "500",
      color: "#fff",
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with gradient */}
      <LinearGradient
        colors={["#C8E6C9", "#E8F5E9", "#f5f5f5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Top bar with provider info */}
        <View style={styles.header}>
          <View style={styles.providerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>JR</Text>
            </View>
            <View style={styles.providerDetails}>
              <Text style={styles.providerName}>{providerInfo.name}</Text>
              <Text style={styles.providerSpecialty}>
                {providerInfo.specialty}
              </Text>
            </View>
          </View>

          <View style={styles.notificationBadge}>
            <Ionicons name="notifications-outline" size={22} color="#333" />
            {providerInfo.notificationCount > 0 && (
              <View style={styles.notificationDot} />
            )}
          </View>
        </View>

        {/* Welcome message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back!</Text>
          <Text style={styles.welcomeSubtitle}>
            Ready to help your patients today?
          </Text>
        </View>

        {/* Availability toggle */}
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityLeft}>
            <View
              style={[
                styles.availabilityDot,
                { backgroundColor: isAvailable ? "#4CAF50" : "#999" },
              ]}
            />
            <Text style={styles.availabilityText}>Available</Text>
          </View>
          <View style={styles.switchContainer}>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: "#d1d1d1", true: "#A5D6A7" }}
              thumbColor={isAvailable ? "#4CAF50" : "#f4f3f4"}
              ios_backgroundColor="#d1d1d1"
            />
          </View>
        </View>
      </LinearGradient>

      {/* Sort bar */}
      <View style={styles.sortBar}>
        <TouchableOpacity style={styles.sortButton}>
          <Ionicons
            name="funnel-outline"
            size={18}
            color="#666"
            style={styles.sortIcon}
          />
          <Text style={styles.sortText}>Sort By</Text>
        </TouchableOpacity>
      </View>

      {/* Patient queue */}
      <ScrollView
        style={styles.queueContainer}
        showsVerticalScrollIndicator={false}
      >
        {patientQueue.map((patient) => (
          <TouchableOpacity key={patient.id} activeOpacity={0.7}>
            <View style={styles.patientCard}>
              {/* Urgency and timestamp */}
              <View style={styles.urgencyRow}>
                <View
                  style={[
                    styles.urgencyBadge,
                    { backgroundColor: getUrgencyColor(patient.urgency) },
                  ]}
                >
                  <Ionicons
                    name="warning"
                    size={14}
                    color="#fff"
                    style={styles.urgencyIcon}
                  />
                  <Text style={styles.urgencyText}>{patient.urgency}</Text>
                </View>
                <Text style={styles.timestamp}>{patient.timestamp}</Text>
              </View>

              {/* Patient name and age */}
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientAge}>{patient.age} years old</Text>

              {/* Specialty badges */}
              <View style={styles.specialtyRow}>
                {patient.specialties.map((specialty, index) => (
                  <View
                    key={index}
                    style={[
                      styles.specialtyBadge,
                      {
                        backgroundColor: index === 0 ? "#8B5CF6" : "#5B8DEE",
                      },
                    ]}
                  >
                    <Ionicons
                      name="medical"
                      size={12}
                      color="#fff"
                      style={styles.specialtyIcon}
                    />
                    <Text style={styles.specialtyText}>{specialty}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
