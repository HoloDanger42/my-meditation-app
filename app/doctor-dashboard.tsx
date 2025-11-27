import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

interface PatientCard {
  id: string;
  userId?: string;
  sessionId?: string;
  name: string;
  age: number;
  urgency: "High" | "Medium" | "Low";
  timestamp: string;
  specialties: string[];
  symptoms?: string;
  urgencyScore?: string;
  urgencyDescription?: string;
  suggestedActions?: string[];
  status?: string;
}

export default function ProviderDashboard() {
  const { theme, isDark } = useTheme();
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientCard | null>(
    null
  );
  const [patientQueue, setPatientQueue] = useState<PatientCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // API Configuration
  const STATUS_CHECK_URL =
    "https://4lfbz4mx6rede2zhzllbptkkjq0myzfs.lambda-url.us-east-1.on.aws";
  const POLL_INTERVAL = 2000; // 2 seconds

  // Fetch patient status from API
  const fetchPatientStatus = async (userId: string, sessionId: string) => {
    try {
      const response = await fetch(
        `${STATUS_CHECK_URL}?userId=${userId}&sessionId=${sessionId}`
      );
      const data = await response.json();

      if (data.status === "completed" && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching patient status:", error);
      return null;
    }
  };

  // Poll for updates on pending patients
  useEffect(() => {
    const pollPatients = async () => {
      // Get all patients that need polling (those with userId and sessionId)
      const pendingPatients = patientQueue.filter(
        (patient) =>
          patient.userId && patient.sessionId && patient.status !== "completed"
      );

      for (const patient of pendingPatients) {
        const updatedData = await fetchPatientStatus(
          patient.userId!,
          patient.sessionId!
        );

        if (updatedData) {
          // Update patient with API data
          setPatientQueue((prev) =>
            prev.map((p) =>
              p.id === patient.id
                ? {
                    ...p,
                    urgency: updatedData.urgency || p.urgency,
                    symptoms: updatedData.symptoms || p.symptoms,
                    urgencyScore: updatedData.urgencyScore || p.urgencyScore,
                    urgencyDescription:
                      updatedData.urgencyDescription || p.urgencyDescription,
                    suggestedActions:
                      updatedData.suggestedActions || p.suggestedActions,
                    specialties: updatedData.specialties || p.specialties,
                    status: "completed",
                  }
                : p
            )
          );
        }
      }
    };

    // Poll every 2 seconds if there are pending patients
    const intervalId = setInterval(pollPatients, POLL_INTERVAL);

    // Initial poll
    pollPatients();

    return () => clearInterval(intervalId);
  }, [patientQueue]);

  // Mock data - replace with actual data from your backend
  // You can initialize this with patient data that has userId and sessionId
  // Example: setPatientQueue([...]) after a patient uploads audio
  useEffect(() => {
    // Initialize with mock data
    const mockData: PatientCard[] = [
      {
        id: "1",
        name: "Maria Santos",
        age: 42,
        urgency: "High",
        timestamp: "10 secs ago",
        specialties: ["Neurological", "Neurologist"],
        symptoms:
          "Acute onset of severe, retro-orbital headache, concurrent with blurry vision, dizziness, and subjective difficulty breathing.",
        urgencyScore: "8/10",
        urgencyDescription:
          "Sudden onset of severe neurological symptoms (headache, vision changes) paired with reported respiratory distress is highly indicative of a time-sensitive neurovascular event (e.g., CVA) or severe systemic crisis.",
        suggestedActions: [
          "Immediate EMS activation and transfer to Emergency Department (ED).",
          "Request immediate BP and SpO2 readings if caregiver present.",
          "Screen for focal neurological deficits (e.g., facial asymmetry, unilateral limb drift).",
        ],
        status: "completed",
      },
      {
        id: "2",
        name: "John Anderson",
        age: 58,
        urgency: "High",
        timestamp: "2 mins ago",
        specialties: ["Neurological", "Neurologist"],
        status: "completed",
      },
      {
        id: "3",
        name: "Sarah Chen",
        age: 34,
        urgency: "Medium",
        timestamp: "5 mins ago",
        specialties: ["Neurological", "Neurologist"],
        status: "completed",
      },
      {
        id: "4",
        name: "Robert Williams",
        age: 67,
        urgency: "Low",
        timestamp: "8 mins ago",
        specialties: ["Neurological", "Neurologist"],
        status: "completed",
      },
    ];
    setPatientQueue(mockData);
  }, []);

  const providerInfo = {
    name: "Jose Rizal",
    specialty: "Neurologist",
    avatar: null, // Replace with actual avatar URI
    notificationCount: 0,
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "High":
        return "#FE805D";
      case "Medium":
        return "#FFA500";
      default:
        return "#7EFD94";
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
      backgroundColor: "#7EFD94",
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: 24,
      width: "100%",
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#f5f5f5",
      justifyContent: "center",
      alignItems: "center",
    },
    modalPatientInfo: {
      flex: 1,
      marginRight: 12,
    },
    modalPatientName: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#1a1a1a",
      marginBottom: 4,
    },
    modalPatientAge: {
      fontSize: 14,
      color: "#666",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#1a1a1a",
      marginTop: 20,
      marginBottom: 8,
    },
    sectionContent: {
      fontSize: 14,
      color: "#333",
      lineHeight: 20,
      marginBottom: 16,
    },
    urgencyScoreBadge: {
      backgroundColor: "#FE805D",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      alignSelf: "flex-start",
      marginVertical: 8,
    },
    urgencyScoreText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#fff",
    },
    actionItem: {
      fontSize: 14,
      color: "#333",
      lineHeight: 20,
      marginBottom: 8,
    },
    callNowButton: {
      backgroundColor: "#7EFD94",
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 20,
    },
    callNowText: {
      fontSize: 16,
      fontWeight: "bold",
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
                { backgroundColor: isAvailable ? "#7EFD94" : "#999" },
              ]}
            />
            <Text style={styles.availabilityText}>Available</Text>
          </View>
          <View style={styles.switchContainer}>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: "#d1d1d1", true: "#A5D6A7" }}
              thumbColor={isAvailable ? "#7EFD94" : "#f4f3f4"}
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
          <TouchableOpacity
            key={patient.id}
            activeOpacity={0.7}
            onPress={() => setSelectedPatient(patient)}
          >
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

      {/* Patient Detail Modal */}
      <Modal
        visible={selectedPatient !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPatient(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPatient && (
              <>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalPatientInfo}>
                    <View
                      style={[
                        styles.urgencyBadge,
                        {
                          backgroundColor: getUrgencyColor(
                            selectedPatient.urgency
                          ),
                        },
                      ]}
                    >
                      <Ionicons
                        name="warning"
                        size={14}
                        color="#fff"
                        style={styles.urgencyIcon}
                      />
                      <Text style={styles.urgencyText}>
                        {selectedPatient.urgency}
                      </Text>
                    </View>
                    <Text style={styles.modalPatientName}>
                      {selectedPatient.name}
                    </Text>
                    <Text style={styles.modalPatientAge}>
                      {selectedPatient.age} years old
                    </Text>
                    <View style={styles.specialtyRow}>
                      {selectedPatient.specialties.map((specialty, index) => (
                        <View
                          key={index}
                          style={[
                            styles.specialtyBadge,
                            {
                              backgroundColor:
                                index === 0 ? "#8B5CF6" : "#5B8DEE",
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
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedPatient(null)}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Symptoms */}
                  <Text style={styles.sectionTitle}>Symptoms</Text>
                  <Text style={styles.sectionContent}>
                    {selectedPatient.symptoms}
                  </Text>

                  {/* Urgency */}
                  <Text style={styles.sectionTitle}>Urgency</Text>
                  {selectedPatient.urgencyScore && (
                    <View style={styles.urgencyScoreBadge}>
                      <Text style={styles.urgencyScoreText}>
                        {selectedPatient.urgencyScore}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.sectionContent}>
                    {selectedPatient.urgencyDescription}
                  </Text>

                  {/* Suggested Action */}
                  <Text style={styles.sectionTitle}>Suggested Action</Text>
                  {selectedPatient.suggestedActions?.map((action, index) => (
                    <Text key={index} style={styles.actionItem}>
                      {index + 1}. {action}
                    </Text>
                  ))}

                  {/* Call Now Button */}
                  <TouchableOpacity style={styles.callNowButton}>
                    <Text style={styles.callNowText}>Call Now</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
