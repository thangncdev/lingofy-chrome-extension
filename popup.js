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
const switchModeBtn = document.getElementById("switchMode");
const currentModeText = document.getElementById("currentMode");

// Pagination variables
let currentPage = 1;
const itemsPerPage = 10;

// Game variables
let currentGameWord = null;
let isShowingWord = true; // true = show word, false = show meaning
let currentOptions = [];

addTab.onclick = () => {
  addSection.style.display = 'block';
  listSection.style.display = 'none';
  gameSection.style.display = 'none';
  addTab.classList.add('active');
  listTab.classList.remove('active');
  gameTab.classList.remove('active');
};

listTab.onclick = () => {
  addSection.style.display = 'none';
  listSection.style.display = 'block';
  gameSection.style.display = 'none';
  addTab.classList.remove('active');
  listTab.classList.add('active');
  gameTab.classList.remove('active');
  loadWords();
};

gameTab.onclick = () => {
  addSection.style.display = 'none';
  listSection.style.display = 'none';
  gameSection.style.display = 'block';
  addTab.classList.remove('active');
  listTab.classList.remove('active');
  gameTab.classList.add('active');
  loadNewGameWord();
};

saveBtn.onclick = () => {
  const word = wordInput.value.trim();
  const meaning = meaningInput.value.trim();
  if (!word || !meaning) return alert("Please fill both fields.");

  chrome.storage.local.get({ dictionary: [] }, (result) => {
    const updated = [...result.dictionary, { word, meaning }];
    chrome.storage.local.set({ dictionary: updated }, () => {
      wordInput.value = '';
      meaningInput.value = '';
    });
  });
};

function openGoogleTranslate(text) {
  const url = `https://translate.google.com/?sl=auto&tl=vi&text=${encodeURIComponent(text)}&op=translate`;
  chrome.tabs.create({ url });
}

function loadWords(filter = "") {
  chrome.storage.local.get({ dictionary: [] }, (result) => {
    const filteredWords = result.dictionary.filter(entry => 
      entry.word.toLowerCase().includes(filter.toLowerCase())
    );
    
    // Random thứ tự hiển thị
    const shuffledWords = [...filteredWords].sort(() => Math.random() - 0.5);
    
    const totalPages = Math.ceil(shuffledWords.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageWords = shuffledWords.slice(start, end);

    wordList.innerHTML = '';
    pageWords.forEach((entry, index) => {
      const li = document.createElement("li");
      
      // Tạo container cho từ và nghĩa
      const contentDiv = document.createElement("div");
      contentDiv.className = "word-content";
      contentDiv.textContent = `${entry.word}: ${entry.meaning}`;
      li.appendChild(contentDiv);

      // Tạo container cho các nút
      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "word-buttons";

      // Nút Google Translate
      const translateBtn = document.createElement("span");
      translateBtn.textContent = "Detail";
      translateBtn.className = "translate-text";
      translateBtn.title = "Translate on Google";
      translateBtn.onclick = () => openGoogleTranslate(entry.word);
      buttonsDiv.appendChild(translateBtn);

      // Nút Delete
      const delBtn = document.createElement("span");
      delBtn.textContent = "Delete";
      delBtn.className = "delete-text";
      delBtn.onclick = () => deleteWord(start + index);
      buttonsDiv.appendChild(delBtn);

      li.appendChild(buttonsDiv);
      wordList.appendChild(li);
    });

    // Update pagination controls
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
  
  // Random 2 từ khác
  const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
  const wrongOptions = shuffled.slice(0, 2).map(word => 
    isShowingWord ? word.meaning : word.word
  );
  
  // Thêm đáp án đúng và random thứ tự
  return [...wrongOptions, correctAnswer].sort(() => Math.random() - 0.5);
}

function updateModeText() {
  currentModeText.textContent = isShowingWord ? "Word-Meaning" : "Meaning-Word";
}

function loadNewGameWord() {
  chrome.storage.local.get({ dictionary: [] }, (result) => {
    if (result.dictionary.length === 0) {
      gameQuestion.textContent = "No words in dictionary!";
      gameAnswer.value = "";
      gameResult.textContent = "";
      return;
    }

    const randomIndex = Math.floor(Math.random() * result.dictionary.length);
    currentGameWord = result.dictionary[randomIndex];

    const correctAnswer = isShowingWord ? currentGameWord.meaning : currentGameWord.word;
    currentOptions = getRandomOptions(correctAnswer, result.dictionary);

    gameQuestion.textContent = isShowingWord ? 
      `What is the meaning of: ${currentGameWord.word}?` :
      `What is the word for: ${currentGameWord.meaning}?`;
    
    gameAnswer.value = "";
    gameResult.textContent = "";

    // Update options
    const optionsContainer = document.getElementById('gameOptions');
    optionsContainer.innerHTML = '';
    currentOptions.forEach(option => {
      const optionBtn = document.createElement('button');
      optionBtn.className = 'option-btn';
      optionBtn.textContent = option;
      optionBtn.style.color = "#000";
      optionBtn.onclick = () => {
        gameAnswer.value = option;
        checkAnswer();
      };
      optionsContainer.appendChild(optionBtn);
    });
  });
}

function checkAnswer() {
  if (!currentGameWord) return;

  const userAnswer = gameAnswer.value.trim().toLowerCase();
  const correctAnswer = isShowingWord ? 
    currentGameWord.meaning.toLowerCase() : 
    currentGameWord.word.toLowerCase();

  // Disable tất cả các nút option
  const optionButtons = document.querySelectorAll('.option-btn');
  optionButtons.forEach(btn => {
    btn.disabled = true;
    const optionText = btn.textContent.toLowerCase();
    
    if (optionText === correctAnswer) {
      // Đáp án đúng
      btn.classList.add('correct-option');
    } else if (optionText === userAnswer) {
      // Đáp án người dùng chọn (nếu sai)
      btn.classList.add('wrong-option');
    }
  });

  if (userAnswer === correctAnswer) {
    gameResult.textContent = "Correct!";
    gameResult.style.color = "#22c55e";
  } else {
    gameResult.textContent = "Wrong!";
    gameResult.style.color = "#ef4444";
  }

  // Load new word after a short delay
  setTimeout(() => {
    loadNewGameWord();
  }, 2000);
}

checkAnswerBtn.onclick = checkAnswer;

skipWordBtn.onclick = () => {
  if (!currentGameWord) return;
  
  gameResult.textContent = `The answer was: ${isShowingWord ? currentGameWord.meaning : currentGameWord.word}`;
  gameResult.style.color = "#64748b";
  
  // Load new word after a short delay
  setTimeout(loadNewGameWord, 2000);
};

// Thêm xử lý cho nút chuyển chế độ
switchModeBtn.onclick = () => {
  isShowingWord = !isShowingWord;
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

      // Import data
      chrome.storage.local.set({ dictionary: data }, () => {
        alert("Import successful!");
        loadWords();
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

// Kiểm tra và xử lý từ được chọn từ context menu
chrome.storage.local.get(['selectedWord'], (result) => {
  if (result.selectedWord) {
    // Chuyển đến tab Add
    addTab.click();
    // Điền từ vào input
    wordInput.value = result.selectedWord;
    // Focus vào ô meaning
    meaningInput.focus();
    // Xóa từ đã lưu
    chrome.storage.local.remove(['selectedWord']);
  }
});

// Khi popup load, nếu tab List đang active thì load luôn danh sách
window.addEventListener('DOMContentLoaded', () => {
  if (listSection.style.display !== 'none' || listTab.classList.contains('active')) {
    loadWords();
  }
});
