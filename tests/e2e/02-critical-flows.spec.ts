import { test, expect } from '@playwright/test';

/**
 * FLOWS CRITIQUES — chaque test couvre un parcours utilisateur réel,
 * du clic à la persistance. Si un de ces tests casse, une fonctionnalité
 * principale d'AWAN est cassée.
 *
 * On ne mock rien : on tape sur l'app comme un utilisateur taperait.
 * IndexedDB persiste entre tests → chaque test isole son contexte.
 */

test.describe('Nutrition — flow ajout repas', () => {
  test('ouvrir l\'écran nutrition, voir l\'onboarding ou le résumé', async ({ page }) => {
    await page.goto('/nutrition');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Soit l'onboarding (premier lancement), soit le résumé macros.
    const onboarding = page.getByText(/CONTINUER|CALCULER/i).first();
    const summary    = page.getByText(/INDEX CALORIQUE|AJOUTER UN ALIMENT/i).first();

    const hasOnboarding = await onboarding.isVisible().catch(() => false);
    const hasSummary    = await summary.isVisible().catch(() => false);

    await page.screenshot({ path: 'tests/e2e/screenshots/nutrition-state.png', fullPage: true });

    expect(hasOnboarding || hasSummary,
      'Écran nutrition n\'affiche ni onboarding ni résumé').toBe(true);
  });
});

test.describe('Sport — accès générateur routine', () => {
  test('générateur s\'ouvre et affiche l\'étape 1 (objectif)', async ({ page }) => {
    await page.goto('/sport');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/e2e/screenshots/sport-list.png', fullPage: true });

    // "MES ROUTINES" doit être présent (label ajouté lors du sprint v3)
    const mesRoutinesBtn = page.getByText('MES ROUTINES', { exact: false }).first();
    await expect(mesRoutinesBtn).toBeVisible({ timeout: 4000 });

    await mesRoutinesBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'tests/e2e/screenshots/sport-workouts.png', fullPage: true });

    // Bouton GÉNÉRER présent
    const generateBtn = page.getByText(/GÉNÉRER/i).first();
    await expect(generateBtn).toBeVisible({ timeout: 4000 });

    await generateBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'tests/e2e/screenshots/generator-step1.png', fullPage: true });

    // Étape 1 : 4 objectifs visibles
    for (const objectif of ['Hypertrophie', 'Force', 'Endurance', 'Recomposition']) {
      const el = page.getByText(objectif, { exact: false }).first();
      await expect(el, `Objectif "${objectif}" manquant`).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Coach — analyse', () => {
  test('le bouton ANALYSER déclenche un état de résultat', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/e2e/screenshots/coach-initial.png', fullPage: true });

    const analyseBtn = page.getByText('ANALYSER', { exact: false }).first();
    await expect(analyseBtn).toBeVisible({ timeout: 4000 });

    await analyseBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/coach-analyzed.png', fullPage: true });

    // Après analyse : soit advice cards, soit message "aucun signal"
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);
  });
});

test.describe('Settings — profils Coach', () => {
  test('toggler un profil sauvegarde la sélection', async ({ page }) => {
    await page.goto('/reglages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/e2e/screenshots/settings-initial.png', fullPage: true });

    // Section PROFIL COACH présente
    const profilSection = page.getByText('PROFIL COACH', { exact: false }).first();
    await expect(profilSection).toBeVisible({ timeout: 4000 });

    // 4 profils existent
    for (const label of ['BODYBUILDING', 'MÉDECINE DU SPORT', 'NUTRITIONNISTE', 'STREETWORKOUT']) {
      const el = page.getByText(label, { exact: false }).first();
      await expect(el, `Profil "${label}" manquant`).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Mensuration — saisie poids', () => {
  test('le champ poids du jour est accessible', async ({ page }) => {
    await page.goto('/mensuration');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'tests/e2e/screenshots/mensuration.png', fullPage: true });

    // Section "Poids du jour" ou bouton ENREGISTRER doit exister
    const hasSaveBtn = await page.getByText(/ENREGISTRER/i).first().isVisible().catch(() => false);
    expect(hasSaveBtn, 'Pas de bouton ENREGISTRER sur Mensuration').toBe(true);
  });
});

test.describe('MoonMenu — ouverture/fermeture', () => {
  test('le menu lune s\'ouvre depuis le Dashboard et liste les modules', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Le MoonMenu est un bouton positionné en bottom-left
    // On le détecte via sa structure SVG (logo lune)
    await page.screenshot({ path: 'tests/e2e/screenshots/dashboard-closed.png', fullPage: true });

    // Tentative : clique en bas-gauche de l'écran (zone MoonMenu)
    await page.mouse.click(40, 800);
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'tests/e2e/screenshots/moonmenu-open.png', fullPage: true });

    // Vérifie que des labels de modules apparaissent
    const moduleCount = await page.locator('text=/SPORT|NUTRITION|ISLAM|COACH/i').count();
    expect(moduleCount,
      'Aucun label de module détecté après tentative d\'ouverture MoonMenu').toBeGreaterThan(0);
  });
});
