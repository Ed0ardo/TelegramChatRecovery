// Function to convert a Unix timestamp to a date/time format
function convertUnixToDateTime(unixTime) {
  const date = new Date(unixTime * 1000);
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Function to convert a JSON message to TXT format
function convertJsonMessageToTxt(message) {
  let dateTime = convertUnixToDateTime(message.date_unixtime);
  let sender = message.from || message.actor || "Unknown";
  let text = "";

  // Handle text
  if (message.text && typeof message.text === "string") {
    text = message.text;
  } else if (message.text_entities) {
    message.text_entities.forEach((entity) => {
      if (entity.type === "plain") {
        text += entity.text;
      } else if (entity.type === "bold") {
        text += `*${entity.text}*`;
      }
    });
  }

  // Function to check if a file is included
  function isFileIncluded(filePath) {
    return /\.\w{1,5}$/.test(filePath);
  }

  // Handle attachments
  if (message.photo) {
    if (!isFileIncluded(message.photo)) {
      text = "<attachment not included>";
    } else {
      text = `<attachment: ${message.photo}>`;
    }
  } else if (message.file) {
    if (!isFileIncluded(message.file)) {
      text = "<attachment not included>";
    } else {
      text = `<attachment: ${message.file}>`;
    }
  } else if (message.location_information) {
    const lat = message.location_information.latitude;
    const lon = message.location_information.longitude;
    text = `Location: https://maps.google.com/?q=${lat},${lon}`;
  } else if (message.contact_information) {
    const contact = message.contact_information;
    text = `Contact: ${contact.first_name} ${contact.last_name} - ${contact.phone_number}`;
  } else if (message.media_type) {
    if (
      message.media_type === "voice_message" ||
      message.media_type === "sticker" ||
      message.media_type === "animation"
    ) {
      if (!isFileIncluded(message.file)) {
        text = "<attachment not included>";
      } else {
        text = `<attachment: ${message.file}>`;
      }
    }
  }

  // Handle reactions
  if (message.reactions) {
    message.reactions.forEach((reaction) => {
      text += ` (Reaction: ${reaction.emoji} from ${reaction.recent[0].from})`;
    });
  }

  // Handle edited messages
  if (message.edited) {
    text += " <This message has been edited>";
  }

  // Handle 'service' type messages (calls, etc.)
  if (message.type === "service") {
    const action = message.action || "";
    if (action === "phone_call") {
      if (message.duration_seconds) {
        text = `Voice call. ${message.duration_seconds} seconds`;
      } else {
        text = "Missed voice call. Tap to call back";
      }
    } else if (action === "video_call") {
      text = "Missed video call. Tap to call back";
    }
  }

  return `[${dateTime}] ${sender}: ${text}`;
}

// Function to convert JSON format to TXT format
function convertJsonToTxt(jsonData) {
  const messages = jsonData.messages;
  let txtContent = "";

  messages.forEach((message) => {
    if (message.type === "message" || message.type === "service") {
      txtContent += convertJsonMessageToTxt(message) + "\n";
    }
  });

  return txtContent;
}

// Function to get the relative path with respect to the current page
function getRelativePath(fullPath) {
  const currentPath = window.location.href; // Get the current page path (index.html)
  const basePath = currentPath.substring(0, currentPath.lastIndexOf("/") + 1); // Remove the file name (index.html)

  // If the full path starts with the current path, remove it
  if (fullPath.startsWith(basePath)) {
    return fullPath.substring(basePath.length); // Return only the relative path
  }
  return fullPath; // If it doesn't start with the current path, return the full path
}

// Function to convert HTML format to TXT format
function convertHtmlToTxt(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  let txtContent = "";
  let lastSender = "Unknown";

  doc.querySelectorAll(".message").forEach((message) => {
    const dateDiv = message.querySelector(".date");
    if (!dateDiv || !dateDiv.title) return;

    let dateTime = dateDiv.title;
    try {
      const date = new Date(dateTime);
      dateTime = date.toLocaleString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (e) {
      return;
    }

    const senderDiv = message.querySelector(".from_name");
    const sender = senderDiv ? senderDiv.textContent.trim() : lastSender;
    lastSender = sender;

    let text = "";
    const textDiv = message.querySelector(".text");
    if (textDiv) {
      text = textDiv.textContent.trim();
    }

    const mediaWrap = message.querySelector(".media_wrap");
    if (mediaWrap) {
      const description = mediaWrap.querySelector(".description");
      if (description) {
        text = "<attachment not included>";
      } else {
        const photoWrap = mediaWrap.querySelector(".photo_wrap");
        if (photoWrap) {
          const relativePath = getRelativePath(photoWrap.href);
          text = `<attachment: ${relativePath}>`;
        }

        const voiceMessage = mediaWrap.querySelector(".media_voice_message");
        if (voiceMessage) {
          const relativePath = getRelativePath(voiceMessage.href);
          text = `<attachment: ${relativePath}>`;
        }

        const mediaFile = mediaWrap.querySelector(".media_file");
        if (mediaFile) {
          const relativePath = getRelativePath(mediaFile.href);
          text = `<attachment: ${relativePath}>`;
        }

        const mediaLocation = mediaWrap.querySelector(".media_location");
        if (mediaLocation) {
          text = `Location: ${mediaLocation.href}`;
        }

        const mediaCall = mediaWrap.querySelector(".media_call");
        if (mediaCall) {
          const callType = mediaCall.querySelector(".title").textContent.trim();
          const status = mediaCall.querySelector(".status").textContent.trim();
          if (status.includes("Incoming") || status.includes("Cancelled")) {
            text = `${callType} ${status}`;
          } else {
            text = `${callType}`;
          }
        }

        const mediaVideo = mediaWrap.querySelector(".media_video");
        if (mediaVideo) {
          const relativePath = getRelativePath(mediaVideo.href);
          text = `<attachment: ${relativePath}>`;
        }

        const animatedWrap = mediaWrap.querySelector(".animated_wrap");
        if (animatedWrap) {
          const relativePath = getRelativePath(animatedWrap.href);
          text = `<attachment: ${relativePath}>`;
        }

        const stickerWrap = mediaWrap.querySelector(".sticker_wrap");
        if (stickerWrap) {
          const relativePath = getRelativePath(stickerWrap.href);
          text = `<attachment: ${relativePath}>`;
        }

        const mediaPhoto = mediaWrap.querySelector(".media_photo");
        if (mediaPhoto) {
          const title = mediaPhoto.querySelector(".title");
          const status = mediaPhoto.querySelector(".status");
          if (title && status) {
            if (title.textContent.trim() === "Sticker") {
              const relativePath = getRelativePath(mediaPhoto.href);
              text = `<attachment: ${relativePath}>`;
            } else {
              text = `${title.textContent.trim()}: ${status.textContent.trim()}`;
            }
          }
        }

        const mediaSelfDestruct = mediaWrap.querySelector(
          ".media_photo, .media_video"
        );
        if (mediaSelfDestruct) {
          const title = mediaSelfDestruct.querySelector(".title");
          const status = mediaSelfDestruct.querySelector(".status");
          if (
            title &&
            status &&
            title.textContent.trim().includes("Self-destructing")
          ) {
            text = `${title.textContent.trim()}: ${status.textContent.trim()}`;
          }
        }

        const mediaContact = mediaWrap.querySelector(".media_contact");
        if (mediaContact) {
          const title = mediaContact.querySelector(".title").textContent.trim();
          const status = mediaContact
            .querySelector(".status")
            .textContent.trim();
          text = `Contact: ${title} - ${status}`;
        }
      }
    }

    const reactionsDiv = message.querySelector(".reactions");
    if (reactionsDiv) {
      reactionsDiv.querySelectorAll(".reaction").forEach((reaction) => {
        const emoji = reaction.querySelector(".emoji").textContent.trim();
        const userpics = reaction.querySelector(".userpics");
        if (userpics) {
          const users = Array.from(userpics.querySelectorAll(".initials")).map(
            (user) => user.title
          );
          text += ` (Reaction: ${emoji} from ${users.join(", ")})`;
        }
      });
    }

    txtContent += `[${dateTime}] ${sender}: ${text}\n`;
  });

  return txtContent;
}

// Function to detect the file format
function detectFileFormat(fileName) {
  const extension = fileName.split(".").pop().toLowerCase();
  if (extension === "json") {
    return "json";
  } else if (extension === "html") {
    return "html";
  } else {
    return "unknown";
  }
}

// Function to download the combined content
function downloadCombinedContent(combinedContent, outputFileName) {
  const blob = new Blob([combinedContent], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = outputFileName;
  link.click();
}

// Handle the HTML form
document.getElementById("fileInput").addEventListener("change", function (e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  let combinedContent = ""; // Variable to store the combined content
  let format = null; // Variable to store the file format (JSON or HTML)

  Array.from(files).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      const fileFormat = detectFileFormat(file.name);

      // Ensure all files are of the same format
      if (format === null) {
        format = fileFormat; // Set the format of the first file
      } else if (format !== fileFormat) {
        alert(
          "Error: All files must be of the same format (all JSON or all HTML)."
        );
        return;
      }

      try {
        if (fileFormat === "json") {
          const jsonData = JSON.parse(content);
          combinedContent += convertJsonToTxt(jsonData);
        } else if (fileFormat === "html") {
          combinedContent += convertHtmlToTxt(content);
        } else {
          throw new Error("Unsupported file format.");
        }

        // If all files have been processed, download the combined content
        if (index === files.length - 1) {
          downloadCombinedContent(combinedContent, "_chat.txt");
        }
      } catch (error) {
        alert("Error: " + error.message);
      }
    };
    reader.readAsText(file);
  });
});
