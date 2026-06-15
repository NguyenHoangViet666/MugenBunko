import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

app_path = r"C:\Users\VTS\.gemini\antigravity\scratch\mugenbunko-react\src\App.jsx"
src_dir = r"C:\Users\VTS\.gemini\antigravity\scratch\mugenbunko-react\src"
pages_dir = os.path.join(src_dir, "pages")
components_dir = os.path.join(src_dir, "components")

os.makedirs(pages_dir, exist_ok=True)
os.makedirs(components_dir, exist_ok=True)

with open(app_path, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

# -----------------------------------------------------------------------------
# Function to join lines by line indices (1-indexed, inclusive)
# -----------------------------------------------------------------------------
def get_lines(start, end):
    return "\n".join(lines[start-1:end])

# -----------------------------------------------------------------------------
# 1. PAGE MODULES EXTRACTION
# -----------------------------------------------------------------------------

# Home.jsx
home_jsx = f"""import React from 'react';

export default function Home({{
    novels,
    currentUser,
    activeNovelId,
    setActiveNovelId,
    currentView,
    setCurrentView,
    filterGenre,
    setFilterGenre,
    selectedTags,
    setSelectedTags,
    filterStatus,
    setFilterStatus,
    filterSort,
    setFilterSort,
    searchQuery,
    setSearchQuery,
    activeBannerId,
    setActiveBannerId,
    genres,
    setLoginModalOpen,
    startReading,
    toggleBookmark,
    computeAverageStars,
    announcements,
    openNovelDetail
}}) {{
    return (
{get_lines(1604, 1848)}
    );
}}
"""

# Library.jsx
library_jsx = f"""import React from 'react';

export default function Library({{
    currentUser,
    novels,
    setCurrentView,
    setActiveNovelId,
    toggleBookmark,
    openNovelDetail
}}) {{
    return (
{get_lines(1853, 1905)}
    );
}}
"""

# NovelDetail.jsx
novel_detail_jsx = f"""import React from 'react';

export default function NovelDetail({{
    novels,
    activeNovelId,
    currentUser,
    setCurrentView,
    setActiveNovelId,
    startReading,
    toggleBookmark,
    toggleFollowAuthor,
    selectedGift,
    setSelectedGift,
    sendGift,
    reviewText,
    setReviewText,
    selectedRatingStars,
    setSelectedRatingStars,
    submitReview,
    commentText,
    setCommentText,
    submitComment,
    comments,
    setComments,
    replyToCommentId,
    setReplyToCommentId,
    replyText,
    setReplyText,
    submitCommentReply,
    reportComment,
    computeAverageStars,
    reviews,
    detailSummaryExpanded,
    setDetailSummaryExpanded
}}) {{
    return (
{get_lines(1910, 2228)}
    );
}}
"""

# ChapterReader.jsx
chapter_reader_jsx = f"""import React from 'react';

export default function ChapterReader({{
    novels,
    activeNovelId,
    activeChapterIndex,
    setActiveChapterIndex,
    setCurrentView,
    startReading,
    navigateToChapter,
    theme,
    setTheme,
    handleThemeChange,
    readerFont,
    setReaderFont,
    readerFontSize,
    setReaderFontSize,
    DB_KEYS,
    openNovelDetail
}}) {{
    return (
{get_lines(2233, 2323)}
    );
}}
"""

# AuthorStudio.jsx
author_studio_jsx = f"""import React from 'react';

export default function AuthorStudio({{
    currentUser,
    novels,
    activeStudioNovelId,
    setActiveStudioNovelId,
    activeStudioChapterIndex,
    setActiveStudioChapterIndex,
    setCurrentView,
    setActiveNovelId,
    setNewNovelModalOpen,
    setScheduleModalOpen,
    createNewChapter,
    saveDraft,
    publishChapter,
    deleteActiveChapter,
    postAuthorAnnouncement,
    autosaveText,
    autosaveColor,
    volNameRef,
    chapterTitleRef,
    contentAreaRef,
    formatDoc,
    insertStaticIllustration,
    announcements
}}) {{
    return (
{get_lines(2328, 2487)}
    );
}}
"""

# ModDashboard.jsx
mod_dashboard_jsx = f"""import React from 'react';

export default function ModDashboard({{
    pendingChapters,
    reports,
    users,
    cashouts,
    modApproveRejectChapter,
    handleCommentReportAction,
    toggleUserSuspension,
    toggleAdminUserRole,
    completeCashoutRequest
}}) {{
    return (
{get_lines(2492, 2661)}
    );
}}
"""

# AdminDashboard.jsx
admin_dashboard_jsx = f"""import React from 'react';

export default function AdminDashboard({{
    novels,
    users,
    cashouts,
    events,
    genres,
    newGenreName,
    setNewGenreName,
    tagMergeFrom,
    setTagMergeFrom,
    tagMergeTo,
    setTagMergeTo,
    adminEventTitle,
    setAdminEventTitle,
    adminEventDesc,
    setAdminEventDesc,
    updateFeaturedBannerSubmit,
    createSystemEventSubmit,
    clearActiveEvent,
    completeCashoutRequest,
    toggleAdminUserRole,
    deleteGenre,
    handleAddGenre,
    modMergeTagsSubmit
}}) {{
    return (
{get_lines(2666, 2895)}
    );
}}
"""

# UserProfile.jsx
user_profile_jsx = f"""import React from 'react';

export default function UserProfile({{
    currentUser,
    profileActiveTab,
    setProfileActiveTab,
    profileDisplayname,
    setProfileDisplayname,
    profileAvatarSeed,
    setProfileAvatarSeed,
    profileBio,
    setProfileBio,
    profileRoles,
    setProfileRoles,
    regenerateProfileAvatar,
    saveBasicProfile,
    handleRoleCheckboxChange,
    saveUserRoles,
    handleDepositCoins,
    cashoutCoinsInput,
    setCashoutCoinsInput,
    submitCashout,
    transactions
}}) {{
    return (
{get_lines(2900, 3062)}
    );
}}
"""

# Write pages to files
with open(os.path.join(pages_dir, "Home.jsx"), 'w', encoding='utf-8') as f:
    f.write(home_jsx)
with open(os.path.join(pages_dir, "Library.jsx"), 'w', encoding='utf-8') as f:
    f.write(library_jsx)
with open(os.path.join(pages_dir, "NovelDetail.jsx"), 'w', encoding='utf-8') as f:
    f.write(novel_detail_jsx)
with open(os.path.join(pages_dir, "ChapterReader.jsx"), 'w', encoding='utf-8') as f:
    f.write(chapter_reader_jsx)
with open(os.path.join(pages_dir, "AuthorStudio.jsx"), 'w', encoding='utf-8') as f:
    f.write(author_studio_jsx)
with open(os.path.join(pages_dir, "ModDashboard.jsx"), 'w', encoding='utf-8') as f:
    f.write(mod_dashboard_jsx)
with open(os.path.join(pages_dir, "AdminDashboard.jsx"), 'w', encoding='utf-8') as f:
    f.write(admin_dashboard_jsx)
with open(os.path.join(pages_dir, "UserProfile.jsx"), 'w', encoding='utf-8') as f:
    f.write(user_profile_jsx)

print("Pages created successfully!")

# -----------------------------------------------------------------------------
# 2. COMPONENTS EXTRACTION
# -----------------------------------------------------------------------------

# Header.jsx
header_jsx = f"""import React from 'react';

export default function Header({{
    currentUser,
    currentView,
    setCurrentView,
    setActiveNovelId,
    searchQuery,
    setSearchQuery,
    notifDropdownOpen,
    setNotifDropdownOpen,
    markAllNotificationsRead,
    burgerOpen,
    setBurgerOpen,
    logoutUser,
    updateUserInDatabase,
    DB_KEYS,
    setCurrentUser,
    setRegisterModalOpen,
    setLoginModalOpen
}}) {{
    return (
{get_lines(1435, 1566)}
    );
}}
"""

# Footer.jsx
footer_jsx = f"""import React from 'react';

export default function Footer({{
    currentUser,
    setCurrentView,
    setActiveNovelId,
    setLoginModalOpen
}}) {{
    return (
{get_lines(3067, 3101)}
    );
}}
"""

# LoginModal.jsx
login_modal_jsx = f"""import React from 'react';

export default function LoginModal({{
    loginModalOpen,
    setLoginModalOpen,
    setRegisterModalOpen,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    handleLoginSubmit
}}) {{
    return (
{get_lines(3107, 3134)}
    );
}}
"""

# RegisterModal.jsx
register_modal_jsx = f"""import React from 'react';

export default function RegisterModal({{
    registerModalOpen,
    setRegisterModalOpen,
    setLoginModalOpen,
    regUsername,
    setRegUsername,
    regDisplayname,
    setRegDisplayname,
    regPassword,
    setRegPassword,
    regRole,
    setRegRole,
    handleRegisterSubmit
}}) {{
    return (
{get_lines(3139, 3171)}
    );
}}
"""

# NewNovelModal.jsx
new_novel_modal_jsx = f"""import React from 'react';

export default function NewNovelModal({{
    newNovelModalOpen,
    setNewNovelModalOpen,
    newNovelTitle,
    setNewNovelTitle,
    newNovelGenre,
    setNewNovelGenre,
    newNovelCover,
    setNewNovelCover,
    newNovelSummary,
    setNewNovelSummary,
    genres,
    createNewNovelSubmit
}}) {{
    return (
{get_lines(3176, 3208)}
    );
}}
"""

# ScheduleModal.jsx
schedule_modal_jsx = f"""import React from 'react';

export default function ScheduleModal({{
    scheduleModalOpen,
    setScheduleModalOpen,
    scheduleDatetime,
    setScheduleDatetime,
    submitScheduleChapter
}}) {{
    return (
{get_lines(3213, 3228)}
    );
}}
"""

# Write components to files
with open(os.path.join(components_dir, "Header.jsx"), 'w', encoding='utf-8') as f:
    f.write(header_jsx)
with open(os.path.join(components_dir, "Footer.jsx"), 'w', encoding='utf-8') as f:
    f.write(footer_jsx)
with open(os.path.join(components_dir, "LoginModal.jsx"), 'w', encoding='utf-8') as f:
    f.write(login_modal_jsx)
with open(os.path.join(components_dir, "RegisterModal.jsx"), 'w', encoding='utf-8') as f:
    f.write(register_modal_jsx)
with open(os.path.join(components_dir, "NewNovelModal.jsx"), 'w', encoding='utf-8') as f:
    f.write(new_novel_modal_jsx)
with open(os.path.join(components_dir, "ScheduleModal.jsx"), 'w', encoding='utf-8') as f:
    f.write(schedule_modal_jsx)

print("Components created successfully!")
