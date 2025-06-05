// Tạo context menu khi extension được cài đặt
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToLingofy",
    title: "Add to Lingofy",
    contexts: ["selection"]
  });
});

// Xử lý khi người dùng click vào context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToLingofy") {
    // Lưu từ được chọn vào storage
    chrome.storage.local.set({ selectedWord: info.selectionText }, () => {
      // Mở popup và chuyển đến tab Add
      chrome.action.openPopup();
    });
  }
}); 