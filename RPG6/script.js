// Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "AIzaSyDt9mJRH-BHlEksl4xla32sVIUGVnLUxWY",
  authDomain: "future-infusion-368721.firebaseapp.com",
  projectId: "future-infusion-368721",
  storageBucket: "future-infusion-368721.firebasestorage.app",
  messagingSenderId: "345445420847",
  appId: "1:345445420847:web:070778c173ec6157c6dbda",
  measurementId: "G-57PJMMNNWW"
};

const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let totalScore = 0;

// Function to check if user is logged in
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "https://rpgtaiwanese.github.io/RPG/";
  } else {
    // Fetch user score from Firebase
    const userRef = database.ref('users/' + user.uid);
    userRef.once('value').then(snapshot => {
      totalScore = snapshot.val() && snapshot.val().totalScore ? snapshot.val().totalScore : 0;
      document.getElementById('notification-count').innerText = "數位通知: " + totalScore;
    });
  }
});

function goBack() {
  window.location.href = "https://rpgtaiwanese.github.io/RPG2/";
}

function makeChoice(choice) {
  let storyText = "";
  if (choice === "gamble") {
    totalScore += 2;
    storyText = "我被卷入了一場極為危險的賭局...";
    updateUserScore();
    window.location.href = "https://rpgtaiwanese.github.io/RPG/";
  } else if (choice === "search") {
    totalScore -= 2;
    storyText = "我踏上了尋找「數位通知」的旅程...";
    updateUserScore();
  } else if (choice === "hack") {
    totalScore -= 2;
    storyText = "我與地下駭客達成了協議...";
    updateUserScore();
  }
  document.getElementById("story-text").innerText = storyText;
}

function updateUserScore() {
  const user = firebase.auth().currentUser;
  if (user) {
    const userRef = database.ref('users/' + user.uid);
    userRef.update({ totalScore: totalScore });
    document.getElementById('notification-count').innerText = "數位通知: " + totalScore;
  }
}