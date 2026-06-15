import os

app_path = r"C:\Users\VTS\.gemini\antigravity\scratch\mugenbunko-react\src\App.jsx"
backup_path = r"C:\Users\VTS\.gemini\antigravity\scratch\mugenbunko-react\src\App.jsx.bak"

# 1. Read existing file
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make backup first
with open(backup_path, 'w', encoding='utf-8') as f:
    f.write(content)

lines = content.split('\n')

# Find signature and return block
sig_idx = -1
return_idx = -1

for idx, line in enumerate(lines):
    if "export default function App()" in line:
        sig_idx = idx
    if "return (" in line and idx > 1300:  # the main return block
        return_idx = idx
        break

if sig_idx == -1 or return_idx == -1:
    print(f"Error: sig_idx={sig_idx}, return_idx={return_idx}")
    exit(1)

# Add imports at the beginning
imports_str = """import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import NewNovelModal from './components/NewNovelModal';
import ScheduleModal from './components/ScheduleModal';

import Home from './pages/Home';
import Library from './pages/Library';
import NovelDetail from './pages/NovelDetail';
import ChapterReader from './pages/ChapterReader';
import AuthorStudio from './pages/AuthorStudio';
import ModDashboard from './pages/ModDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserProfile from './pages/UserProfile';
"""

# Rest of the imports and state declarations
header_and_states = "\n".join(lines[1:return_idx])

# Define the openNovelDetail function inside App component
open_novel_detail_fn = """
    const openNovelDetail = (novelId) => {
        setActiveNovelId(novelId);
        setCurrentView('detail');
    };
"""

# Locate where to insert openNovelDetail function
# Insert right after the start of App function body
target_signature = "export default function App() {"
insert_pos = header_and_states.find(target_signature)
if insert_pos == -1:
    # fallback to just find of signature if formatting differs
    insert_pos = header_and_states.find("export default function App()")
    if insert_pos != -1:
        insert_pos += len("export default function App()")
        # find the next '{'
        brace_pos = header_and_states.find("{", insert_pos)
        insert_pos = brace_pos + 1
else:
    insert_pos += len(target_signature)

header_and_states = header_and_states[:insert_pos] + open_novel_detail_fn + header_and_states[insert_pos:]

# Construct the new return statement
new_return_str = """
    return (
        <>
            {/* Sakura floating petals overlay */}
            <div id="sakura-container">
                {petals.map(p => (
                    <div
                        key={p.id}
                        className="sakura-petal"
                        style={{
                            left: `${p.left}vw`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            transform: `scale(${p.scale})`
                        }}
                        onAnimationEnd={() => removePetal(p.id)}
                    />
                ))}
            </div>

            {/* Notification Toast */}
            <div id="toast-notification" className={`toast ${toastShow ? 'show' : 'hidden'}`}>
                <span className="toast-message">{toastMsg}</span>
            </div>

            {/* Navbar Header (Conditionally hidden inside reader mode) */}
            {currentView !== 'reader' && (
                <Header
                    currentUser={currentUser}
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    setActiveNovelId={setActiveNovelId}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    notifDropdownOpen={notifDropdownOpen}
                    setNotifDropdownOpen={setNotifDropdownOpen}
                    markAllNotificationsRead={markAllNotificationsRead}
                    burgerOpen={burgerOpen}
                    setBurgerOpen={setBurgerOpen}
                    logoutUser={logoutUser}
                    updateUserInDatabase={updateUserInDatabase}
                    DB_KEYS={DB_KEYS}
                    setCurrentUser={setCurrentUser}
                    setRegisterModalOpen={setRegisterModalOpen}
                    setLoginModalOpen={setLoginModalOpen}
                />
            )}

            {/* Breadcrumbs bar (Conditionally hidden inside reader mode) */}
            {currentView !== 'reader' && (
                <div className="top-meta-bar">
                    <div className="container flex-row-between">
                        <div className="breadcrumbs">
                            {renderBreadcrumbs()}
                        </div>
                        <div className="role-status">
                            Vai trò: <span className="role-badge" style={{background: currentUser && currentUser.roles.includes('admin') ? '#cc0000' : (currentUser && currentUser.roles.includes('moderator') ? '#1b365d' : 'var(--sakura-pink)')}}>
                                {currentUser ? currentUser.roles.join(" + ") : "Khách"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Layout */}
            <main className={`app-content-container ${currentView === 'reader' ? '' : 'container'}`}>
                
                {/* Dynamic site wide active system event announcement banner */}
                {currentView !== 'reader' && events.some(ev => ev.status === 'active') && (
                    <div className="event-banner">
                        <div className="event-content">
                            <span className="event-tag">Sự kiện hệ thống 🌸</span>
                            {events.filter(ev => ev.status === 'active').map(ev => (
                                <span key={ev.id}>
                                    <strong>{ev.title}</strong> - <span>{ev.desc}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* ================= PAGES RENDERING ================= */}
                {currentView === 'home' && (
                    <Home
                        novels={novels}
                        currentUser={currentUser}
                        activeNovelId={activeNovelId}
                        setActiveNovelId={setActiveNovelId}
                        currentView={currentView}
                        setCurrentView={setCurrentView}
                        filterGenre={filterGenre}
                        setFilterGenre={setFilterGenre}
                        selectedTags={selectedTags}
                        setSelectedTags={setSelectedTags}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterSort={filterSort}
                        setFilterSort={setFilterSort}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        activeBannerId={activeBannerId}
                        setActiveBannerId={setActiveBannerId}
                        genres={genres}
                        setLoginModalOpen={setLoginModalOpen}
                        startReading={startReading}
                        toggleBookmark={toggleBookmark}
                        computeAverageStars={computeAverageStars}
                        announcements={announcements}
                        openNovelDetail={openNovelDetail}
                    />
                )}

                {currentView === 'library' && (
                    <Library
                        currentUser={currentUser}
                        novels={novels}
                        setCurrentView={setCurrentView}
                        setActiveNovelId={setActiveNovelId}
                        toggleBookmark={toggleBookmark}
                        openNovelDetail={openNovelDetail}
                    />
                )}

                {currentView === 'detail' && (
                    <NovelDetail
                        novels={novels}
                        activeNovelId={activeNovelId}
                        currentUser={currentUser}
                        setCurrentView={setCurrentView}
                        setActiveNovelId={setActiveNovelId}
                        startReading={startReading}
                        toggleBookmark={toggleBookmark}
                        toggleFollowAuthor={toggleFollowAuthor}
                        selectedGift={selectedGift}
                        setSelectedGift={setSelectedGift}
                        sendGift={sendGift}
                        reviewText={reviewText}
                        setReviewText={setReviewText}
                        selectedRatingStars={selectedRatingStars}
                        setSelectedRatingStars={setSelectedRatingStars}
                        submitReview={submitReview}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        submitComment={submitComment}
                        comments={comments}
                        setComments={setComments}
                        replyToCommentId={replyToCommentId}
                        setReplyToCommentId={setReplyToCommentId}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        submitCommentReply={submitCommentReply}
                        reportComment={reportComment}
                        computeAverageStars={computeAverageStars}
                        reviews={reviews}
                        detailSummaryExpanded={detailSummaryExpanded}
                        setDetailSummaryExpanded={setDetailSummaryExpanded}
                    />
                )}

                {currentView === 'reader' && (
                    <ChapterReader
                        novels={novels}
                        activeNovelId={activeNovelId}
                        activeChapterIndex={activeChapterIndex}
                        setActiveChapterIndex={setActiveChapterIndex}
                        setCurrentView={setCurrentView}
                        startReading={startReading}
                        navigateToChapter={navigateToChapter}
                        theme={theme}
                        setTheme={setTheme}
                        handleThemeChange={handleThemeChange}
                        readerFont={readerFont}
                        setReaderFont={setReaderFont}
                        readerFontSize={readerFontSize}
                        setReaderFontSize={setReaderFontSize}
                        DB_KEYS={DB_KEYS}
                        openNovelDetail={openNovelDetail}
                    />
                )}

                {currentView === 'studio' && (
                    <AuthorStudio
                        currentUser={currentUser}
                        novels={novels}
                        activeStudioNovelId={activeStudioNovelId}
                        setActiveStudioNovelId={setActiveStudioNovelId}
                        activeStudioChapterIndex={activeStudioChapterIndex}
                        setActiveStudioChapterIndex={setActiveStudioChapterIndex}
                        setCurrentView={setCurrentView}
                        setActiveNovelId={setActiveNovelId}
                        setNewNovelModalOpen={setNewNovelModalOpen}
                        setScheduleModalOpen={setScheduleModalOpen}
                        createNewChapter={createNewChapter}
                        saveDraft={saveDraft}
                        publishChapter={publishChapter}
                        deleteActiveChapter={deleteActiveChapter}
                        postAuthorAnnouncement={postAuthorAnnouncement}
                        autosaveText={autosaveText}
                        autosaveColor={autosaveColor}
                        setAutosaveText={setAutosaveText}
                        setAutosaveColor={setAutosaveColor}
                        volNameRef={volNameRef}
                        chapterTitleRef={chapterTitleRef}
                        contentAreaRef={contentAreaRef}
                        formatDoc={formatDoc}
                        insertStaticIllustration={insertStaticIllustration}
                        announcements={announcements}
                    />
                )}

                {currentView === 'mod-dashboard' && (
                    <ModDashboard
                        pendingChapters={pendingChapters}
                        reports={reports}
                        users={users}
                        cashouts={cashouts}
                        modApproveRejectChapter={modApproveRejectChapter}
                        modRejectChapter={modRejectChapter}
                        handleCommentReportAction={handleCommentReportAction}
                        toggleUserSuspension={toggleUserSuspension}
                        toggleAdminUserRole={toggleAdminUserRole}
                        completeCashoutRequest={completeCashoutRequest}
                        novels={novels}
                        setCurrentView={setCurrentView}
                        tagMergeFrom={tagMergeFrom}
                        setTagMergeFrom={setTagMergeFrom}
                        tagMergeTo={tagMergeTo}
                        setTagMergeTo={setTagMergeTo}
                        modMergeTagsSubmit={modMergeTagsSubmit}
                    />
                )}

                {currentView === 'admin-dashboard' && (
                    <AdminDashboard
                        novels={novels}
                        users={users}
                        cashouts={cashouts}
                        events={events}
                        genres={genres}
                        newGenreName={newGenreName}
                        setNewGenreName={setNewGenreName}
                        tagMergeFrom={tagMergeFrom}
                        setTagMergeFrom={setTagMergeFrom}
                        tagMergeTo={tagMergeTo}
                        setTagMergeTo={setTagMergeTo}
                        adminEventTitle={adminEventTitle}
                        setAdminEventTitle={setAdminEventTitle}
                        adminEventDesc={adminEventDesc}
                        setAdminEventDesc={setAdminEventDesc}
                        updateFeaturedBannerSubmit={updateFeaturedBannerSubmit}
                        createSystemEventSubmit={createSystemEventSubmit}
                        clearActiveEvent={clearActiveEvent}
                        completeCashoutRequest={completeCashoutRequest}
                        toggleAdminUserRole={toggleAdminUserRole}
                        deleteGenre={deleteGenre}
                        handleAddGenre={handleAddGenre}
                        modMergeTagsSubmit={modMergeTagsSubmit}
                        setCurrentView={setCurrentView}
                        activeBannerId={activeBannerId}
                        reports={reports}
                        modApproveRejectChapter={modApproveRejectChapter}
                        handleCommentReportAction={handleCommentReportAction}
                    />
                )}

                {currentView === 'profile' && (
                    <UserProfile
                        currentUser={currentUser}
                        profileActiveTab={profileActiveTab}
                        setProfileActiveTab={setProfileActiveTab}
                        profileDisplayname={profileDisplayname}
                        setProfileDisplayname={setProfileDisplayname}
                        profileAvatarSeed={profileAvatarSeed}
                        setProfileAvatarSeed={setProfileAvatarSeed}
                        profileBio={profileBio}
                        setProfileBio={setProfileBio}
                        profileRoles={profileRoles}
                        setProfileRoles={setProfileRoles}
                        regenerateProfileAvatar={regenerateProfileAvatar}
                        saveBasicProfile={saveBasicProfile}
                        handleRoleCheckboxChange={handleRoleCheckboxChange}
                        saveUserRoles={saveUserRoles}
                        handleDepositCoins={handleDepositCoins}
                        cashoutCoinsInput={cashoutCoinsInput}
                        setCashoutCoinsInput={setCashoutCoinsInput}
                        submitCashout={submitCashout}
                        transactions={transactions}
                        setCurrentView={setCurrentView}
                    />
                )}
            </main>

            {/* Footer Widget */}
            {currentView !== 'reader' && (
                <Footer
                    currentUser={currentUser}
                    setCurrentView={setCurrentView}
                    setActiveNovelId={setActiveNovelId}
                    setLoginModalOpen={setLoginModalOpen}
                />
            )}

            {/* ================= MODALS & OVERLAYS ================= */}
            {loginModalOpen && (
                <LoginModal
                    loginModalOpen={loginModalOpen}
                    setLoginModalOpen={setLoginModalOpen}
                    setRegisterModalOpen={setRegisterModalOpen}
                    loginUsername={loginUsername}
                    setLoginUsername={setLoginUsername}
                    loginPassword={loginPassword}
                    setLoginPassword={setLoginPassword}
                    handleLoginSubmit={handleLoginSubmit}
                />
            )}

            {registerModalOpen && (
                <RegisterModal
                    registerModalOpen={registerModalOpen}
                    setRegisterModalOpen={setRegisterModalOpen}
                    setLoginModalOpen={setLoginModalOpen}
                    regUsername={regUsername}
                    setRegUsername={setRegUsername}
                    regDisplayname={regDisplayname}
                    setRegDisplayname={setRegDisplayname}
                    regPassword={regPassword}
                    setRegPassword={setRegPassword}
                    regRole={regRole}
                    setRegRole={setRegRole}
                    handleRegisterSubmit={handleRegisterSubmit}
                />
            )}

            {newNovelModalOpen && (
                <NewNovelModal
                    newNovelModalOpen={newNovelModalOpen}
                    setNewNovelModalOpen={setNewNovelModalOpen}
                    newNovelTitle={newNovelTitle}
                    setNewNovelTitle={setNewNovelTitle}
                    newNovelGenre={newNovelGenre}
                    setNewNovelGenre={setNewNovelGenre}
                    newNovelCover={newNovelCover}
                    setNewNovelCover={setNewNovelCover}
                    newNovelSummary={newNovelSummary}
                    setNewNovelSummary={setNewNovelSummary}
                    genres={genres}
                    createNewNovelSubmit={createNewNovelSubmit}
                />
            )}

            {scheduleModalOpen && (
                <ScheduleModal
                    scheduleModalOpen={scheduleModalOpen}
                    setScheduleModalOpen={setScheduleModalOpen}
                    scheduleDatetime={scheduleDatetime}
                    setScheduleDatetime={setScheduleDatetime}
                    submitScheduleChapter={submitScheduleChapter}
                />
            )}
        </>
    );
}
"""

final_content = imports_str + header_and_states + new_return_str

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("App.jsx rewritten successfully!")
