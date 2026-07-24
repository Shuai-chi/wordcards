import type { UILang } from './languages';

export interface PersonalizationStrings {
  icons: string;
  generalAndBackup: string;
  typography: string;
  baseTextSize: string;
  pageHeadingSize: string;
  cardTitleSize: string;
  cardBodySize: string;
  statNumberSize: string;
  iconSize: string;
  studyPromptSize: string;
  studyContentSize: string;
  preview: string;
  previewStudyAnswer: string;
  decrease: string;
  increase: string;
  reset: string;
  resetAll: string;
  iconProfiles: string;
  profileName: string;
  uploadImage: string;
  replaceImage: string;
  removeImage: string;
  fitImage: string;
  fillImage: string;
  resetPosition: string;
  imageZoom: string;
  dragHint: string;
  imageRequirements: string;
  defaultIcon: string;
  uploadError: string;
  saved: string;
  saveChanges: string;
  closeSettings: string;
  unsavedTitle: string;
  unsavedDescription: string;
  returnToEditing: string;
  discardAndClose: string;
  colorCommandTitle: string;
  colorCommandShowCurrent: string;
  colorCommandCopyCurrent: string;
  colorCommandApply: string;
  colorCommandRestore: string;
  colorCommandPlaceholder: string;
  colorCommandRule: string;
  colorCommandApplied: string;
  colorCommandRestored: string;
  colorCommandCopied: string;
  colorCommandCopyFailed: string;
}

export const PERSONALIZATION_STRINGS: Record<UILang, PersonalizationStrings> = {
  'zh-TW': {
    icons: '圖標', generalAndBackup: '一般與備份', typography: '文字與圖標尺寸',
    baseTextSize: '基礎文字', pageHeadingSize: '頁面主標題', cardTitleSize: '卡片主標題',
    cardBodySize: '卡片說明文字', statNumberSize: '統計數字', iconSize: '卡片圖標',
    studyPromptSize: '練習卡主詞／片語', studyContentSize: '練習卡答案內容',
    preview: '即時預覽', previewStudyAnswer: '定義、例句與補充內容', decrease: '縮小', increase: '放大',
    reset: '重設', resetAll: '全部恢復預設', iconProfiles: '圖片設定', profileName: '設定名稱',
    uploadImage: '上傳圖片', replaceImage: '更換圖片', removeImage: '移除圖片', fitImage: '完整適應',
    fillImage: '填滿框架', resetPosition: '重設位置', imageZoom: '圖片縮放',
    dragHint: '可在預覽框內拖曳圖片調整位置。',
    imageRequirements: 'PNG、JPG 或 WebP；每張最多 512 KiB。', defaultIcon: '目前使用預設圖標',
    uploadError: '圖片無法使用', saved: '已儲存', saveChanges: '儲存', closeSettings: '關閉設定',
    unsavedTitle: '尚未儲存變更', unsavedDescription: '離開後將不保留這些變更。',
    returnToEditing: '回到編輯', discardAndClose: '捨棄變更並離開',
    colorCommandTitle: 'AI 色彩指令', colorCommandShowCurrent: '顯示目前配置', colorCommandCopyCurrent: '一鍵複製',
    colorCommandApply: '套用色彩指令', colorCommandRestore: '恢復最近儲存的配色',
    colorCommandPlaceholder: 'background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED',
    colorCommandRule: '格式：key=#RRGGBB;key=#RRGGBB｜對照：background=背景、card=卡片、primary=主色、accent=強調｜可只填要修改的項目',
    colorCommandApplied: '已套用', colorCommandRestored: '已恢復最近儲存的配色。',
    colorCommandCopied: '目前配色指令已複製。', colorCommandCopyFailed: '無法複製，請允許剪貼簿權限後再試。',
  },
  en: {
    icons: 'Icons', generalAndBackup: 'General & backup', typography: 'Text and icon sizes',
    baseTextSize: 'Base text', pageHeadingSize: 'Page heading', cardTitleSize: 'Card title',
    cardBodySize: 'Card description', statNumberSize: 'Statistic number', iconSize: 'Card icon',
    studyPromptSize: 'Study word / phrase', studyContentSize: 'Study answer content',
    preview: 'Live preview', previewStudyAnswer: 'Definition, example, and supporting content', decrease: 'Decrease', increase: 'Increase',
    reset: 'Reset', resetAll: 'Reset all', iconProfiles: 'Image profiles', profileName: 'Profile name',
    uploadImage: 'Upload image', replaceImage: 'Replace image', removeImage: 'Remove image', fitImage: 'Fit',
    fillImage: 'Fill frame', resetPosition: 'Reset position', imageZoom: 'Image zoom',
    dragHint: 'Drag the image inside the preview to reposition it.',
    imageRequirements: 'PNG, JPG, or WebP; up to 512 KiB each.', defaultIcon: 'Using the default icon',
    uploadError: 'Image cannot be used', saved: 'Saved', saveChanges: 'Save', closeSettings: 'Close settings',
    unsavedTitle: 'Unsaved changes', unsavedDescription: 'These changes will not be kept if you leave.',
    returnToEditing: 'Return to editing', discardAndClose: 'Discard changes and close',
    colorCommandTitle: 'AI color command', colorCommandShowCurrent: 'Show current palette', colorCommandCopyCurrent: 'Copy command',
    colorCommandApply: 'Apply color command', colorCommandRestore: 'Restore last saved palette',
    colorCommandPlaceholder: 'background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED',
    colorCommandRule: 'Format: key=#RRGGBB;key=#RRGGBB | Keys: background, card, primary, accent | Partial updates are allowed',
    colorCommandApplied: 'Applied', colorCommandRestored: 'Restored the last saved palette.',
    colorCommandCopied: 'Current palette command copied.', colorCommandCopyFailed: 'Copy failed. Allow clipboard access and try again.',
  },
  ja: {
    icons: 'アイコン', generalAndBackup: '一般とバックアップ', typography: '文字とアイコンのサイズ',
    baseTextSize: '基本テキスト', pageHeadingSize: 'ページ見出し', cardTitleSize: 'カード見出し',
    cardBodySize: 'カード説明', statNumberSize: '統計数字', iconSize: 'カードアイコン',
    studyPromptSize: '学習単語／フレーズ', studyContentSize: '学習カードの答え',
    preview: 'ライブプレビュー', previewStudyAnswer: '定義・例文・補足内容', decrease: '縮小', increase: '拡大',
    reset: 'リセット', resetAll: 'すべて初期化', iconProfiles: '画像設定', profileName: '設定名',
    uploadImage: '画像を追加', replaceImage: '画像を変更', removeImage: '画像を削除', fitImage: '全体表示',
    fillImage: '枠を埋める', resetPosition: '位置を初期化', imageZoom: '画像ズーム',
    dragHint: 'プレビュー内で画像をドラッグして位置を調整できます。',
    imageRequirements: 'PNG、JPG、WebP。1枚512 KiBまで。', defaultIcon: '標準アイコンを使用中',
    uploadError: '画像を使用できません', saved: '保存済み', saveChanges: '保存', closeSettings: '設定を閉じる',
    unsavedTitle: '未保存の変更', unsavedDescription: '終了すると、これらの変更は保存されません。',
    returnToEditing: '編集に戻る', discardAndClose: '変更を破棄して閉じる',
    colorCommandTitle: 'AI カラーコマンド', colorCommandShowCurrent: '現在の配色を表示', colorCommandCopyCurrent: 'コマンドをコピー',
    colorCommandApply: 'カラーコマンドを適用', colorCommandRestore: '最後に保存した配色へ戻す',
    colorCommandPlaceholder: 'background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED',
    colorCommandRule: '形式：key=#RRGGBB;key=#RRGGBB｜対応：background=背景、card=カード、primary=主色、accent=強調色｜変更項目だけでも指定可能',
    colorCommandApplied: '適用済み', colorCommandRestored: '最後に保存した配色へ戻しました。',
    colorCommandCopied: '現在の配色コマンドをコピーしました。', colorCommandCopyFailed: 'コピーできません。クリップボード権限を許可してください。',
  },
  ko: {
    icons: '아이콘', generalAndBackup: '일반 및 백업', typography: '텍스트와 아이콘 크기',
    baseTextSize: '기본 텍스트', pageHeadingSize: '페이지 제목', cardTitleSize: '카드 제목',
    cardBodySize: '카드 설명', statNumberSize: '통계 숫자', iconSize: '카드 아이콘',
    studyPromptSize: '학습 단어／구문', studyContentSize: '학습 카드 답변',
    preview: '실시간 미리보기', previewStudyAnswer: '정의, 예문 및 추가 내용', decrease: '축소', increase: '확대',
    reset: '초기화', resetAll: '모두 초기화', iconProfiles: '이미지 설정', profileName: '설정 이름',
    uploadImage: '이미지 업로드', replaceImage: '이미지 변경', removeImage: '이미지 제거', fitImage: '전체 맞춤',
    fillImage: '프레임 채우기', resetPosition: '위치 초기화', imageZoom: '이미지 확대/축소',
    dragHint: '미리보기 안에서 이미지를 드래그해 위치를 조정할 수 있습니다.',
    imageRequirements: 'PNG, JPG 또는 WebP, 파일당 최대 512 KiB.', defaultIcon: '기본 아이콘 사용 중',
    uploadError: '이미지를 사용할 수 없습니다', saved: '저장됨', saveChanges: '저장', closeSettings: '설정 닫기',
    unsavedTitle: '저장하지 않은 변경 사항', unsavedDescription: '나가면 이 변경 사항은 저장되지 않습니다.',
    returnToEditing: '편집으로 돌아가기', discardAndClose: '변경 사항을 버리고 닫기',
    colorCommandTitle: 'AI 색상 명령', colorCommandShowCurrent: '현재 색상 표시', colorCommandCopyCurrent: '명령 복사',
    colorCommandApply: '색상 명령 적용', colorCommandRestore: '마지막 저장 색상 복원',
    colorCommandPlaceholder: 'background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED',
    colorCommandRule: '형식: key=#RRGGBB;key=#RRGGBB | 대응: background=배경, card=카드, primary=주요 색상, accent=강조 색상 | 일부 항목만 입력 가능',
    colorCommandApplied: '적용됨', colorCommandRestored: '마지막으로 저장한 색상을 복원했습니다.',
    colorCommandCopied: '현재 색상 명령을 복사했습니다.', colorCommandCopyFailed: '복사할 수 없습니다. 클립보드 권한을 허용하세요.',
  },
  de: {
    icons: 'Symbole', generalAndBackup: 'Allgemein & Sicherung', typography: 'Text- und Symbolgrößen',
    baseTextSize: 'Grundtext', pageHeadingSize: 'Seitenüberschrift', cardTitleSize: 'Kartentitel',
    cardBodySize: 'Kartenbeschreibung', statNumberSize: 'Statistikzahl', iconSize: 'Kartensymbol',
    studyPromptSize: 'Lernwort / Ausdruck', studyContentSize: 'Antwortinhalt der Lernkarte',
    preview: 'Live-Vorschau', previewStudyAnswer: 'Definition, Beispiel und Zusatzinhalt', decrease: 'Verkleinern', increase: 'Vergrößern',
    reset: 'Zurücksetzen', resetAll: 'Alles zurücksetzen', iconProfiles: 'Bildprofile', profileName: 'Profilname',
    uploadImage: 'Bild hochladen', replaceImage: 'Bild ersetzen', removeImage: 'Bild entfernen', fitImage: 'Einpassen',
    fillImage: 'Rahmen füllen', resetPosition: 'Position zurücksetzen', imageZoom: 'Bildzoom',
    dragHint: 'Ziehen Sie das Bild in der Vorschau, um es zu positionieren.',
    imageRequirements: 'PNG, JPG oder WebP; maximal 512 KiB pro Bild.', defaultIcon: 'Standardsymbol wird verwendet',
    uploadError: 'Bild kann nicht verwendet werden', saved: 'Gespeichert', saveChanges: 'Speichern', closeSettings: 'Einstellungen schließen',
    unsavedTitle: 'Nicht gespeicherte Änderungen', unsavedDescription: 'Diese Änderungen gehen beim Verlassen verloren.',
    returnToEditing: 'Weiter bearbeiten', discardAndClose: 'Änderungen verwerfen und schließen',
    colorCommandTitle: 'AI-Farbbefehl', colorCommandShowCurrent: 'Aktuelle Palette anzeigen', colorCommandCopyCurrent: 'Befehl kopieren',
    colorCommandApply: 'Farbbefehl anwenden', colorCommandRestore: 'Zuletzt gespeicherte Palette',
    colorCommandPlaceholder: 'background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED',
    colorCommandRule: 'Format: key=#RRGGBB;key=#RRGGBB | Zuordnung: background=Hintergrund, card=Karte, primary=Primärfarbe, accent=Akzent | Teiländerungen sind erlaubt',
    colorCommandApplied: 'Angewendet', colorCommandRestored: 'Zuletzt gespeicherte Palette wiederhergestellt.',
    colorCommandCopied: 'Aktueller Palettenbefehl kopiert.', colorCommandCopyFailed: 'Kopieren fehlgeschlagen. Zwischenablagezugriff erlauben.',
  },
  es: {
    icons: 'Iconos', generalAndBackup: 'General y copia', typography: 'Tamaños de texto e iconos',
    baseTextSize: 'Texto base', pageHeadingSize: 'Título de página', cardTitleSize: 'Título de tarjeta',
    cardBodySize: 'Descripción de tarjeta', statNumberSize: 'Número estadístico', iconSize: 'Icono de tarjeta',
    studyPromptSize: 'Palabra / frase de estudio', studyContentSize: 'Contenido de respuesta',
    preview: 'Vista previa en vivo', previewStudyAnswer: 'Definición, ejemplo y contenido adicional', decrease: 'Reducir', increase: 'Ampliar',
    reset: 'Restablecer', resetAll: 'Restablecer todo', iconProfiles: 'Perfiles de imágenes', profileName: 'Nombre del perfil',
    uploadImage: 'Subir imagen', replaceImage: 'Cambiar imagen', removeImage: 'Quitar imagen', fitImage: 'Ajustar',
    fillImage: 'Llenar marco', resetPosition: 'Restablecer posición', imageZoom: 'Zoom de imagen',
    dragHint: 'Arrastra la imagen dentro de la vista previa para colocarla.',
    imageRequirements: 'PNG, JPG o WebP; máximo 512 KiB por imagen.', defaultIcon: 'Usando el icono predeterminado',
    uploadError: 'No se puede usar la imagen', saved: 'Guardado', saveChanges: 'Guardar', closeSettings: 'Cerrar ajustes',
    unsavedTitle: 'Cambios sin guardar', unsavedDescription: 'Estos cambios no se conservarán si sales.',
    returnToEditing: 'Volver a editar', discardAndClose: 'Descartar cambios y cerrar',
    colorCommandTitle: 'Comando de color IA', colorCommandShowCurrent: 'Mostrar paleta actual', colorCommandCopyCurrent: 'Copiar comando',
    colorCommandApply: 'Aplicar comando de color', colorCommandRestore: 'Restaurar última paleta guardada',
    colorCommandPlaceholder: 'background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED',
    colorCommandRule: 'Formato: key=#RRGGBB;key=#RRGGBB | Correspondencia: background=fondo, card=tarjeta, primary=principal, accent=acento | Se permiten cambios parciales',
    colorCommandApplied: 'Aplicado', colorCommandRestored: 'Se restauró la última paleta guardada.',
    colorCommandCopied: 'Se copió el comando de la paleta actual.', colorCommandCopyFailed: 'No se pudo copiar. Permite el acceso al portapapeles.',
  },
  fr: {
    icons: 'Icônes', generalAndBackup: 'Général et sauvegarde', typography: 'Tailles du texte et des icônes',
    baseTextSize: 'Texte de base', pageHeadingSize: 'Titre de page', cardTitleSize: 'Titre de carte',
    cardBodySize: 'Description de carte', statNumberSize: 'Nombre statistique', iconSize: 'Icône de carte',
    studyPromptSize: 'Mot / expression à étudier', studyContentSize: 'Contenu de la réponse',
    preview: 'Aperçu en direct', previewStudyAnswer: 'Définition, exemple et contenu complémentaire', decrease: 'Réduire', increase: 'Agrandir',
    reset: 'Réinitialiser', resetAll: 'Tout réinitialiser', iconProfiles: 'Profils d’images', profileName: 'Nom du profil',
    uploadImage: 'Importer une image', replaceImage: 'Remplacer l’image', removeImage: 'Supprimer l’image', fitImage: 'Ajuster',
    fillImage: 'Remplir le cadre', resetPosition: 'Réinitialiser la position', imageZoom: 'Zoom de l’image',
    dragHint: 'Faites glisser l’image dans l’aperçu pour la repositionner.',
    imageRequirements: 'PNG, JPG ou WebP ; 512 Kio maximum par image.', defaultIcon: 'Icône par défaut utilisée',
    uploadError: 'L’image ne peut pas être utilisée', saved: 'Enregistré', saveChanges: 'Enregistrer', closeSettings: 'Fermer les réglages',
    unsavedTitle: 'Modifications non enregistrées', unsavedDescription: 'Ces modifications seront perdues si vous quittez.',
    returnToEditing: 'Reprendre la modification', discardAndClose: 'Ignorer les modifications et fermer',
    colorCommandTitle: 'Commande couleur IA', colorCommandShowCurrent: 'Afficher la palette actuelle', colorCommandCopyCurrent: 'Copier la commande',
    colorCommandApply: 'Appliquer la commande couleur', colorCommandRestore: 'Restaurer la dernière palette',
    colorCommandPlaceholder: 'background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED',
    colorCommandRule: 'Format : key=#RRGGBB;key=#RRGGBB | Correspondance : background=arrière-plan, card=carte, primary=principale, accent=accent | Modifications partielles acceptées',
    colorCommandApplied: 'Appliqué', colorCommandRestored: 'Dernière palette enregistrée restaurée.',
    colorCommandCopied: 'Commande de la palette actuelle copiée.', colorCommandCopyFailed: 'Copie impossible. Autorisez l’accès au presse-papiers.',
  },
  th: {
    icons: 'ไอคอน', generalAndBackup: 'ทั่วไปและสำรองข้อมูล', typography: 'ขนาดข้อความและไอคอน',
    baseTextSize: 'ข้อความพื้นฐาน', pageHeadingSize: 'หัวข้อหน้า', cardTitleSize: 'หัวข้อการ์ด',
    cardBodySize: 'คำอธิบายการ์ด', statNumberSize: 'ตัวเลขสถิติ', iconSize: 'ไอคอนการ์ด',
    studyPromptSize: 'คำ／วลีในการ์ดเรียน', studyContentSize: 'เนื้อหาคำตอบในการ์ดเรียน',
    preview: 'ตัวอย่างแบบสด', previewStudyAnswer: 'คำจำกัดความ ตัวอย่าง และเนื้อหาเสริม', decrease: 'ลดขนาด', increase: 'เพิ่มขนาด',
    reset: 'รีเซ็ต', resetAll: 'คืนค่าเริ่มต้นทั้งหมด', iconProfiles: 'ชุดรูปภาพ', profileName: 'ชื่อชุด',
    uploadImage: 'อัปโหลดรูป', replaceImage: 'เปลี่ยนรูป', removeImage: 'ลบรูป', fitImage: 'พอดีทั้งรูป',
    fillImage: 'เต็มกรอบ', resetPosition: 'รีเซ็ตตำแหน่ง', imageZoom: 'ซูมรูปภาพ',
    dragHint: 'ลากรูปภายในตัวอย่างเพื่อปรับตำแหน่งได้',
    imageRequirements: 'PNG, JPG หรือ WebP; ไม่เกิน 512 KiB ต่อรูป', defaultIcon: 'กำลังใช้ไอคอนเริ่มต้น',
    uploadError: 'ไม่สามารถใช้รูปภาพนี้ได้', saved: 'บันทึกแล้ว', saveChanges: 'บันทึก', closeSettings: 'ปิดการตั้งค่า',
    unsavedTitle: 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก', unsavedDescription: 'การเปลี่ยนแปลงเหล่านี้จะไม่ถูกเก็บไว้หากออกจากหน้านี้',
    returnToEditing: 'กลับไปแก้ไข', discardAndClose: 'ละทิ้งการเปลี่ยนแปลงและปิด',
    colorCommandTitle: 'คำสั่งสี AI', colorCommandShowCurrent: 'แสดงชุดสีปัจจุบัน', colorCommandCopyCurrent: 'คัดลอกคำสั่ง',
    colorCommandApply: 'ใช้คำสั่งสี', colorCommandRestore: 'คืนค่าชุดสีที่บันทึกล่าสุด',
    colorCommandPlaceholder: 'background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED',
    colorCommandRule: 'รูปแบบ: key=#RRGGBB;key=#RRGGBB | ความหมาย: background=พื้นหลัง, card=การ์ด, primary=สีหลัก, accent=สีเน้น | ระบุเฉพาะรายการที่ต้องการแก้ได้',
    colorCommandApplied: 'ใช้แล้ว', colorCommandRestored: 'คืนค่าชุดสีที่บันทึกล่าสุดแล้ว',
    colorCommandCopied: 'คัดลอกคำสั่งชุดสีปัจจุบันแล้ว', colorCommandCopyFailed: 'คัดลอกไม่ได้ โปรดอนุญาตการเข้าถึงคลิปบอร์ด',
  },
};
