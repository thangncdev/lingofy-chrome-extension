const wordInput = document.getElementById("word");
const meaningInput = document.getElementById("meaning");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const wordList = document.getElementById("wordList");
const addTab = document.getElementById("addTab");
const listTab = document.getElementById("listTab");
const gameTab = document.getElementById("gameTab");
const addSection = document.getElementById("addSection");
const listSection = document.getElementById("listSection");
const gameSection = document.getElementById("gameSection");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const gameQuestion = document.getElementById("gameQuestion");
const gameAnswer = document.getElementById("gameAnswer");
const checkAnswerBtn = document.getElementById("checkAnswer");
const skipWordBtn = document.getElementById("skipWord");
const gameResult = document.getElementById("gameResult");
const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const switchModeInput = document.getElementById("switchMode");
const currentModeText = document.getElementById("currentMode");
const searchInput = document.getElementById("searchInput");
const clearAllBtn = document.getElementById("clearAllBtn");
const achievementsTab = document.getElementById("achievementsTab");
const achievementsSection = document.getElementById("achievementsSection");
const openAddModalBtn = document.getElementById('openAddModalBtn');
const addWordModal = document.getElementById('addWordModal');
const saveModalBtn = document.getElementById('saveModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const modalWord = document.getElementById('modalWord');
const modalMeaning = document.getElementById('modalMeaning');
const modalPartOfSpeech = document.getElementById('modalPartOfSpeech');
const gameOptions = document.getElementById('gameOptions');

// Pagination variables
let currentPage = 1;
const itemsPerPage = 5;

// Game variables
let currentGameWord = null;
let isShowingWord = false; // true = show word, false = show meaning
let currentOptions = [];
let searchKeyword = "";

// Achievement system
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  10,     // Level 2
  50,     // Level 3
  100,    // Level 4
  200     // Level 5
];

const BADGES = [
  {
    id: 'level-1',
    name: 'Beginner',
    description: 'Start your learning journey',
    icon: 'images/beginner.png',
    level: 1
  },
  {
    id: 'level-2',
    name: 'Intermediate',
    description: 'Keep up the good work!',
    icon: 'images/intermediate.png',
    level: 2
  },
  {
    id: 'level-3',
    name: 'Advanced',
    description: 'You\'re getting really good!',
    icon: 'images/advanced.png',
    level: 3
  },
  {
    id: 'level-4',
    name: 'Expert',
    description: 'Almost there!',
    icon: 'images/expert.png',
    level: 4
  },
  {
    id: 'level-5',
    name: 'Master',
    description: 'You\'ve reached the top!',
    icon: 'images/master.png',
    level: 5
  }
];

// Open modal
openAddModalBtn.onclick = () => {
  modalWord.value = '';
  modalMeaning.value = '';
  addWordModal.style.display = 'flex';
  setTimeout(() => modalWord.focus(), 100);
};
// Close modal
function closeAddModal() {
  addWordModal.style.display = 'none';
}
cancelModalBtn.onclick = closeAddModal;

// Save new word from modal
saveModalBtn.onclick = () => {
  const word = modalWord.value.trim();
  const meaning = modalMeaning.value.trim();
  const partOfSpeech = modalPartOfSpeech.value;
  if (!word || !meaning) return alert('Please fill both fields.');
  chrome.storage.local.get({ dictionary: [] }, (result) => {
    const updated = [...result.dictionary, { word, meaning, partOfSpeech }];
    chrome.storage.local.set({ dictionary: updated }, () => {
      closeAddModal();
      loadWords();
    });
  });
};

// Enter key submits in modal
modalWord.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveModalBtn.click(); });
modalMeaning.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveModalBtn.click(); });

// Handle quick-add from context menu
chrome.storage.local.get(['selectedWord'], (result) => {
  if (result.selectedWord) {
    // Open modal and prefill word
    modalWord.value = result.selectedWord;
    modalMeaning.value = '';
    addWordModal.style.display = 'flex';
    setTimeout(() => modalMeaning.focus(), 100);
    chrome.storage.local.remove(['selectedWord']);
  }
});

// Update tab switching logic to remove Add tab/section
listTab.onclick = () => {
  listSection.style.display = 'block';
  gameSection.style.display = 'none';
  achievementsSection.style.display = 'none';
  listTab.classList.add('active');
  gameTab.classList.remove('active');
  achievementsTab.classList.remove('active');
  loadWords();
};

gameTab.onclick = () => {
  listSection.style.display = 'none';
  gameSection.style.display = 'block';
  achievementsSection.style.display = 'none';
  listTab.classList.remove('active');
  gameTab.classList.add('active');
  achievementsTab.classList.remove('active');
  addErrorListButton();
  loadNewGameWord();
};

achievementsTab.onclick = () => {
  listSection.style.display = 'none';
  gameSection.style.display = 'none';
  achievementsSection.style.display = 'block';
  listTab.classList.remove('active');
  gameTab.classList.remove('active');
  achievementsTab.classList.add('active');
  updateAchievements();
};

window.addEventListener('DOMContentLoaded', () => {
  listSection.style.display = 'block';
  gameSection.style.display = 'none';
  achievementsSection.style.display = 'none';
  listTab.classList.add('active');
  gameTab.classList.remove('active');
  achievementsTab.classList.remove('active');
  loadWords();
  
  // Update version in footer
  const versionSpan = document.querySelector('.author-info span:nth-child(2)');
  if (versionSpan) {
    const manifest = chrome.runtime.getManifest();
    versionSpan.textContent = `Version: ${manifest.version}`;
  }
  
  // Initialize achievements if achievements tab is visible
  if (achievementsSection.style.display !== 'none') {
    updateAchievements();
  }
});

function openGoogleTranslate(text) {
  const url = `https://translate.google.com/?sl=auto&tl=vi&text=${encodeURIComponent(text)}&op=translate`;
  chrome.tabs.create({ url });
}

searchInput.addEventListener("input", (e) => {
  searchKeyword = e.target.value.trim();
  currentPage = 1;
  loadWords(searchKeyword);
});

function loadWords(filter = "") {
  chrome.storage.local.get({ dictionary: [] }, (result) => {
    const filteredWords = result.dictionary.filter(entry => 
      entry.word.toLowerCase().includes(filter.toLowerCase()) ||
      entry.meaning.toLowerCase().includes(filter.toLowerCase())
    );
    
    // Random thứ tự hiển thị
    const shuffledWords = [...filteredWords].sort(() => Math.random() - 0.5);
    
    const totalPages = Math.ceil(shuffledWords.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageWords = shuffledWords.slice(start, end);

    wordList.innerHTML = '';
    if (pageWords.length === 0) {
      wordList.innerHTML = '<div class="empty-list-message" style="text-align:center; color:#64748b; padding: 32px 0; font-size: 16px;">No words have been added yet.</div>';
    } else {
      pageWords.forEach((entry, index) => {
        const li = document.createElement("li");
        
        // Tạo container cho từ và nghĩa
        const contentDiv = document.createElement("div");
        contentDiv.className = "word-content";
        let wordHtml = `<span>${entry.word}</span>`;
        if (entry.partOfSpeech) {
          wordHtml += ` <span class='pos-badge'>${entry.partOfSpeech}</span>`;
        }
        contentDiv.innerHTML = `${wordHtml}: ${entry.meaning}`;
        li.appendChild(contentDiv);

        // Tạo container cho các nút
        const buttonsDiv = document.createElement("div");
        buttonsDiv.className = "word-buttons";

        // Nút Edit
        const editBtn = document.createElement("span");
        editBtn.innerHTML = '<span class="material-icons edit-icon">edit</span>';
        editBtn.title = "Edit word";
        editBtn.onclick = () => {
          modalWord.value = entry.word;
          modalMeaning.value = entry.meaning;
          modalPartOfSpeech.value = entry.partOfSpeech || '';
          addWordModal.style.display = 'flex';
          setTimeout(() => modalMeaning.focus(), 100);

          // Cập nhật hàm save để cập nhật từ thay vì thêm mới
          const originalSaveBtn = saveModalBtn.onclick;
          saveModalBtn.onclick = () => {
            const word = modalWord.value.trim();
            const meaning = modalMeaning.value.trim();
            const partOfSpeech = modalPartOfSpeech.value;
            if (!word || !meaning) return alert('Please fill both fields.');
            
            chrome.storage.local.get({ dictionary: [] }, (result) => {
              const updated = result.dictionary.map(item => 
                item.word === entry.word ? { word, meaning, partOfSpeech } : item
              );
              chrome.storage.local.set({ dictionary: updated }, () => {
                closeAddModal();
                loadWords();
                // Khôi phục lại hàm save ban đầu
                saveModalBtn.onclick = originalSaveBtn;
              });
            });
          };
        };
        buttonsDiv.appendChild(editBtn);

        // Nút Google Translate
        const translateBtn = document.createElement("span");
        translateBtn.innerHTML = '<span class="material-icons translate-icon">translate</span>';
        translateBtn.title = "Translate on Google";
        translateBtn.onclick = () => openGoogleTranslate(entry.word);
        buttonsDiv.appendChild(translateBtn);

        // Nút Delete
        const delBtn = document.createElement("span");
        delBtn.innerHTML = '<span class="material-icons delete-icon">delete</span>';
        delBtn.title = "Delete word";
        delBtn.onclick = () => {
          if (confirm('Are you sure you want to delete this word?')) {
            chrome.storage.local.get({ dictionary: [] }, (result) => {
              const updated = result.dictionary.filter(item => item.word !== entry.word);
              chrome.storage.local.set({ dictionary: updated }, () => {
                loadWords();
              });
            });
          }
        };
        buttonsDiv.appendChild(delBtn);

        li.appendChild(buttonsDiv);
        wordList.appendChild(li);
      });
    }
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  });
}

function deleteWord(index) {
  chrome.storage.local.get({ dictionary: [] }, (result) => {
    const updated = result.dictionary;
    updated.splice(index, 1);
    chrome.storage.local.set({ dictionary: updated }, loadWords);
  });
}

prevPageBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    loadWords();
  }
};

nextPageBtn.onclick = () => {
  chrome.storage.local.get({ dictionary: [] }, (result) => {
    const totalPages = Math.ceil(result.dictionary.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      loadWords();
    }
  });
};

function getRandomOptions(correctAnswer, allWords) {
  // Lọc ra các từ khác với đáp án đúng
  const otherWords = allWords.filter(word => 
    word.word !== correctAnswer && word.meaning !== correctAnswer
  );
  
  // Random 3 từ khác (thay vì 2)
  const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
  const wrongOptions = shuffled.slice(0, 3).map(word => ({
    text: isShowingWord ? word.meaning : word.word,
    meaning: isShowingWord ? word.word : word.meaning
  }));
  
  // Thêm đáp án đúng và random thứ tự
  const correctOption = {
    text: correctAnswer,
    meaning: isShowingWord ? currentGameWord.word : currentGameWord.meaning
  };
  
  return [...wrongOptions, correctOption].sort(() => Math.random() - 0.5);
}

function updateModeText() {
  currentModeText.textContent = isShowingWord ? "Word-Meaning" : "Meaning-Word";
  switchModeInput.checked = !isShowingWord;
}

function loadNewGameWord() {
  chrome.storage.local.get({ dictionary: [] }, (result) => {
    const allWords = result.dictionary;
    if (allWords.length === 0) {
      gameQuestion.innerHTML = '<div class="empty-list-message" style="text-align:center; color:#64748b; padding: 32px 0; font-size: 16px;">No words have been added yet.</div>';
      gameAnswer.style.display = 'none';
      checkAnswerBtn.style.display = 'none';
      skipWordBtn.style.display = 'none';
      gameOptions.style.display = 'none';
      return;
    }

    gameAnswer.style.display = 'block';
    checkAnswerBtn.style.display = 'block';
    skipWordBtn.style.display = 'block';

    const randomIndex = Math.floor(Math.random() * allWords.length);
    currentGameWord = allWords[randomIndex];

    // Generate options
    const correctAnswer = isShowingWord ? currentGameWord.meaning : currentGameWord.word;
    currentOptions = getRandomOptions(correctAnswer, allWords);

    if (isShowingWord) {
      gameQuestion.innerHTML = `
        <div class="game-word">${currentGameWord.word}</div>
        ${currentGameWord.partOfSpeech ? `<div class="game-pos">${currentGameWord.partOfSpeech}</div>` : ''}
      `;
      gameAnswer.placeholder = "Enter the meaning...";
    } else {
      gameQuestion.innerHTML = `
        <div class="game-meaning">${currentGameWord.meaning}</div>
      `;
      gameAnswer.placeholder = "Enter the word...";
    }

    // Show options
    gameOptions.innerHTML = '';
    currentOptions.forEach(option => {
      const optionBtn = document.createElement('button');
      optionBtn.className = 'option-btn';
      optionBtn.textContent = option.text;
      optionBtn.onclick = () => {
        gameAnswer.value = option.text;
        checkAnswer();
      };
      gameOptions.appendChild(optionBtn);
    });

    gameAnswer.value = "";
    gameResult.innerHTML = "";
    gameAnswer.focus();
  });
}

function getWordMeaning(word, allWords) {
  console.log('Looking up meaning for:', word);
  console.log('All words:', allWords);
  
  // Tìm từ trong dictionary
  const entry = allWords.find(item => {
    if (isShowingWord) {
      // Nếu đang ở chế độ Word-Meaning, tìm theo word
      return item.word.toLowerCase() === word.toLowerCase();
    } else {
      // Nếu đang ở chế độ Meaning-Word, tìm theo meaning
      return item.meaning.toLowerCase() === word.toLowerCase();
    }
  });
  
  console.log('Found entry:', entry);
  
  if (!entry) {
    console.log('No entry found for:', word);
    return '';
  }
  
  // Trả về nghĩa tương ứng
  const result = isShowingWord ? entry.meaning : entry.word;
  console.log('Returning:', result);
  return result;
}

function checkAnswer() {
  const userAnswer = gameAnswer.value.trim().toLowerCase();
  const correctAnswer = isShowingWord ? 
    currentGameWord.meaning.toLowerCase() : 
    currentGameWord.word.toLowerCase();

  // Disable tất cả các nút option
  const optionButtons = document.querySelectorAll('.option-btn');
  optionButtons.forEach((btn, index) => {
    btn.disabled = true;
    const optionText = btn.textContent.toLowerCase();
    const meaning = currentOptions[index].meaning;

    // Show meaning on a new line below the word
    btn.innerHTML = `<div>${btn.textContent}</div><div class='option-meaning'>${meaning}</div>`;

    if (optionText === correctAnswer) {
      btn.classList.add('correct-option');
    } else if (optionText === userAnswer) {
      btn.classList.add('wrong-option');
    }
  });

  if (userAnswer === correctAnswer) {
    gameResult.innerHTML = `
      <div class="correct-answer">
        <span class="material-icons" style="color: #10b981; vertical-align: middle;">check_circle</span>
        Correct!
      </div>
      <div class="answer-details">
        <div class="word-row">
          <div class="word-label">Word:</div>
          <div class="word-value">${currentGameWord.word}</div>
        </div>
        <div class="meaning-row">
          <div class="meaning-label">Meaning:</div>
          <div class="meaning-value">${currentGameWord.meaning}</div>
        </div>
        ${currentGameWord.partOfSpeech ? `
          <div class="pos-row">
            <div class="pos-label">Part of Speech:</div>
            <div class="pos-value">${currentGameWord.partOfSpeech}</div>
          </div>
        ` : ''}
      </div>
    `;
    // Update achievements
    chrome.storage.local.get({ correctAnswers: 0 }, (result) => {
      const newTotal = result.correctAnswers + 1;
      chrome.storage.local.set({ correctAnswers: newTotal }, () => {
        updateAchievements();
      });
    });
  } else {
    gameResult.innerHTML = `
      <div class="wrong-answer">
        <span class="material-icons" style="color: #ef4444; vertical-align: middle;">cancel</span>
        Incorrect!
      </div>
      <div class="answer-details">
        <div class="word-row">
          <div class="word-label">Word:</div>
          <div class="word-value">${currentGameWord.word}</div>
        </div>
        <div class="meaning-row">
          <div class="meaning-label">Meaning:</div>
          <div class="meaning-value">${currentGameWord.meaning}</div>
        </div>
        ${currentGameWord.partOfSpeech ? `
          <div class="pos-row">
            <div class="pos-label">Part of Speech:</div>
            <div class="pos-value">${currentGameWord.partOfSpeech}</div>
          </div>
        ` : ''}
      </div>
    `;
    // Lưu số lần sai vào wordErrors
    chrome.storage.local.get({ wordErrors: {} }, (result) => {
      const wordErrors = result.wordErrors || {};
      const wordKey = isShowingWord ? currentGameWord.word : currentGameWord.meaning;
      wordErrors[wordKey] = (wordErrors[wordKey] || 0) + 1;
      chrome.storage.local.set({ wordErrors });
    });
  }

  setTimeout(loadNewGameWord, 3000);
}

checkAnswerBtn.onclick = checkAnswer;

skipWordBtn.onclick = () => {
  if (!currentGameWord) return;
  
  gameResult.textContent = `The answer was: ${isShowingWord ? currentGameWord.meaning : currentGameWord.word}`;
  gameResult.style.color = "#64748b";
  
  // Load new word after a short delay
  setTimeout(loadNewGameWord, 3000);
};

// Thêm xử lý cho nút chuyển chế độ
switchModeInput.onchange = () => {
  isShowingWord = !switchModeInput.checked;
  updateModeText();
  loadNewGameWord();
};

// Khởi tạo text chế độ
updateModeText();

// Initialize game on load
loadNewGameWord();

// Import/Export handlers
importBtn.onclick = () => {
  importFile.click();
};

importFile.onchange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) {
        throw new Error("Invalid format");
      }

      // Validate data format
      const isValid = data.every(item => 
        typeof item === 'object' && 
        typeof item.word === 'string' && 
        typeof item.meaning === 'string'
      );

      if (!isValid) {
        throw new Error("Invalid data format");
      }

      // Simply append new words to dictionary
      chrome.storage.local.get({ dictionary: [] }, (result) => {
        const updatedDict = [...result.dictionary, ...data];
        chrome.storage.local.set({ dictionary: updatedDict }, () => {
          alert(`Import successful! ${data.length} words added.`);
          loadWords();
          loadNewGameWord();
        });
      });
    } catch (error) {
      alert("Error importing file: " + error.message);
    }
    // Reset file input
    event.target.value = '';
  };
  reader.readAsText(file);
};

exportBtn.onclick = () => {
  chrome.storage.local.get({ dictionary: [] }, (result) => {
    if (result.dictionary.length === 0) {
      alert("No words to export!");
      return;
    }

    const dataStr = JSON.stringify(result.dictionary, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'lingofy-dictionary.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  });
};

// Thêm nút để xem danh sách từ sai nhiều
function addErrorListButton() {
  const gameControls = document.querySelector('.game-controls');
  if (!gameControls) return;
  // Remove existing button if present
  const oldBtn = document.getElementById('errorListBtn');
  if (oldBtn) oldBtn.remove();
  const errorListBtn = document.createElement('button');
  errorListBtn.id = 'errorListBtn';
  errorListBtn.className = 'control-btn';
  errorListBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    Error List
  `;
  errorListBtn.onclick = showErrorList;
  gameControls.appendChild(errorListBtn);
}

function showErrorList() {
  chrome.storage.local.get({ wordErrors: {}, dictionary: [] }, (result) => {
    const wordErrors = result.wordErrors || {};
    const dictionary = result.dictionary || [];
    console.log(wordErrors, 'wordErrors');
    console.log(dictionary, 'dictionary');
    // Tạo danh sách từ và số lần sai
    const errorList = Object.entries(wordErrors)
      .map(([word, count]) => {
        const entry = dictionary.find(item => 
          item.word === word || item.meaning === word
        );
        return {
          word: entry ? entry.word : word,
          meaning: entry ? entry.meaning : 'Unknown',
          errorCount: count
        };
      })
      .sort((a, b) => b.errorCount - a.errorCount);
    console.log(errorList, 'errorList');
    // Hiển thị danh sách
    const errorListHtml = errorList.map(item => 
      `<div class="error-item">
        <span class="error-word">${item.word}</span>
        <span class="error-meaning">${item.meaning}</span>
        <span class="error-count">(${item.errorCount} errors)</span>
      </div>`
    ).join('');

    // Tạo modal để hiển thị
    const modal = document.createElement('div');
    modal.className = 'error-modal';
    modal.innerHTML = `
      <div class="error-modal-content">
        <div class="error-modal-header">
          <h3>Words with Most Errors</h3>
          <span class="material-icons edit-icon close-modal-error-list" title="Close">close</span>
        </div>
        <div class="error-list">
          ${errorListHtml}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Xử lý đóng modal
    modal.querySelector('.close-modal-error-list').onclick = () => {
      modal.remove();
    };
  });
}

// Thêm CSS cho error list
const style = document.createElement('style');
style.textContent = `
  .error-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .error-modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 80%;
    max-height: 80%;
    overflow-y: auto;
  }

  .error-item {
    display: flex;
    gap: 10px;
    margin: 10px 0;
    padding: 5px;
    border-bottom: 1px solid #eee;
  }

  .error-word {
    font-weight: bold;
    min-width: 100px;
  }

  .error-meaning {
    flex: 1;
  }

  .error-count {
    color: #ef4444;
  }

  .close-modal {
    margin-top: 20px;
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .close-modal:hover {
    background: #2563eb;
  }
`;
document.head.appendChild(style);

clearAllBtn.onclick = () => {
  if (confirm("Are you sure you want to delete all words? This action cannot be undone.")) {
    chrome.storage.local.set({ dictionary: [], wordErrors: {} }, () => {
      loadWords();
      alert("All words have been deleted.");
    });
  }
};

function updateAchievements() {
  chrome.storage.local.get({ correctAnswers: 0 }, (result) => {
    const correctAnswers = result.correctAnswers || 0;
    
    // Update stats
    document.getElementById('totalCorrectAnswers').textContent = correctAnswers;
    
    // Calculate current level
    let currentLevel = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (correctAnswers >= LEVEL_THRESHOLDS[i]) {
        currentLevel = i + 1;
        break;
      }
    }
    document.getElementById('currentLevel').textContent = currentLevel;
    
    // Show current badge at top of stats-summary
    const currentBadge = BADGES.find(b => b.level === currentLevel);
    const badgeDisplay = document.getElementById('currentBadgeDisplay');
    if (currentBadge && badgeDisplay) {
      badgeDisplay.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <img src="${currentBadge.icon}" alt="${currentBadge.name}" style="width: 56px; height: 56px; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.08); background: #f1f5f9; margin-bottom: 2px;">
          <div style="font-weight: 600; color: #1e293b; font-size: 15px;">${currentBadge.name}</div>
        </div>
      `;
    }
    
    // Calculate progress to next level
    const nextLevelThreshold = LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const currentLevelThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
    const progress = ((correctAnswers - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100;
    document.getElementById('levelProgress').style.width = `${Math.min(progress, 100)}%`;
    
    // Update badges
    const badgesList = document.getElementById('badgesList');
    badgesList.innerHTML = '';
    
    BADGES.forEach(badge => {
      const badgeElement = document.createElement('div');
      badgeElement.className = `badge-item ${badge.level > currentLevel ? 'locked' : ''}`;
      badgeElement.innerHTML = `
        <div class=\"badge-icon badge-level-${badge.level}\"><img src=\"${badge.icon}\" alt=\"${badge.name}\" style=\"width: 40px; height: 40px; object-fit: contain; opacity: ${badge.level > currentLevel ? 0.5 : 1};\"></div>
        <div class=\"badge-name\">${badge.name}</div>
        <div class=\"badge-description\">${badge.description}</div>
      `;
      badgesList.appendChild(badgeElement);
    });
  });
}