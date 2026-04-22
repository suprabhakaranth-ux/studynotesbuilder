export interface FormulaEntry {
  label: string;
  latex: string;
  /** Optional short hint shown as tooltip / subtitle. */
  hint?: string;
}

export interface FormulaCategory {
  category: string;
  formulas: FormulaEntry[];
}

/**
 * Pre-built formulas from the Statistics Pocket Book.
 * Each `latex` string is ready to render with KaTeX in display mode.
 */
export const FORMULA_LIBRARY: FormulaCategory[] = [
  {
    category: "Standard Deviation",
    formulas: [
      {
        label: "SD (master formula)",
        latex: "\\sigma = \\sqrt{\\dfrac{\\sum (X - \\bar{X})^2}{N}}",
        hint: "Population SD using deviations from the mean",
      },
      {
        label: "SD (computational)",
        latex: "\\sigma = \\sqrt{\\dfrac{\\sum X^2}{N} - \\left(\\dfrac{\\sum X}{N}\\right)^2}",
        hint: "Computational shortcut form",
      },
    ],
  },
  {
    category: "Correlation",
    formulas: [
      {
        label: "Pearson r (via Covariance)",
        latex: "r = \\dfrac{\\operatorname{Cov}_{xy}}{S_x \\cdot S_y}",
        hint: "Short form using covariance and SDs",
      },
      {
        label: "Pearson r (full computational)",
        latex:
          "r = \\dfrac{\\sum xy - \\dfrac{(\\sum x)(\\sum y)}{n}}{\\sqrt{\\left[\\sum x^2 - \\dfrac{(\\sum x)^2}{n}\\right]\\left[\\sum y^2 - \\dfrac{(\\sum y)^2}{n}\\right]}}",
        hint: "Full computational form (raw scores)",
      },
    ],
  },
  {
    category: "Regression",
    formulas: [
      {
        label: "Variance of X — Sₓ²",
        latex: "S_x^2 = \\dfrac{\\sum x^2}{n} - \\left(\\dfrac{\\sum x}{n}\\right)^2",
      },
      {
        label: "Variance of Y — Sy²",
        latex: "S_y^2 = \\dfrac{\\sum y^2}{n} - \\left(\\dfrac{\\sum y}{n}\\right)^2",
      },
      {
        label: "Covariance — Covₓy",
        latex: "\\operatorname{Cov}_{xy} = \\dfrac{\\sum xy}{n} - \\left(\\dfrac{\\sum x}{n}\\right)\\left(\\dfrac{\\sum y}{n}\\right)",
      },
      {
        label: "Regression of Y on X",
        latex: "Y = a + bX, \\quad b = \\dfrac{\\operatorname{Cov}_{xy}}{S_x^2}, \\quad a = \\bar{Y} - b\\bar{X}",
      },
      {
        label: "Regression of X on Y",
        latex: "X = a + bY, \\quad b = \\dfrac{\\operatorname{Cov}_{xy}}{S_y^2}, \\quad a = \\bar{X} - b\\bar{Y}",
      },
    ],
  },
  {
    category: "One-Way ANOVA",
    formulas: [
      {
        label: "SS Between (SSB)",
        latex: "SS_B = \\sum_{j=1}^{k} n_j (\\bar{X}_j - \\bar{X})^2",
      },
      {
        label: "SS Within (SSW)",
        latex: "SS_W = \\sum_{j=1}^{k} \\sum_{i=1}^{n_j} (X_{ij} - \\bar{X}_j)^2",
      },
      {
        label: "SS Total (SST)",
        latex: "SS_T = SS_B + SS_W = \\sum (X_{ij} - \\bar{X})^2",
      },
      {
        label: "Mean Square Between (MSB)",
        latex: "MS_B = \\dfrac{SS_B}{k - 1}",
      },
      {
        label: "Mean Square Within (MSW)",
        latex: "MS_W = \\dfrac{SS_W}{N - k}",
      },
      {
        label: "F-ratio",
        latex: "F = \\dfrac{MS_B}{MS_W}",
      },
    ],
  },
  {
    category: "Spearman ρ",
    formulas: [
      {
        label: "Spearman ρ (untied ranks)",
        latex: "\\rho = 1 - \\dfrac{6 \\sum D^2}{N(N^2 - 1)}",
      },
      {
        label: "Spearman ρ (tied ranks)",
        latex:
          "\\rho = 1 - \\dfrac{6 \\left[\\sum D^2 + \\sum \\dfrac{(t^3 - t)}{12}\\right]}{N(N^2 - 1)}",
      },
    ],
  },
  {
    category: "Kendall τ",
    formulas: [
      {
        label: "Kendall τ",
        latex: "\\tau = \\dfrac{2(C - D)}{N(N - 1)}",
        hint: "C = concordant pairs, D = discordant pairs",
      },
    ],
  },
  {
    category: "Mann-Whitney",
    formulas: [
      {
        label: "U statistic",
        latex: "U = n_1 n_2 + \\dfrac{n_1(n_1 + 1)}{2} - R_1",
      },
      {
        label: "U′ statistic",
        latex: "U' = n_1 n_2 + \\dfrac{n_2(n_2 + 1)}{2} - R_2",
      },
      {
        label: "U + U′ identity",
        latex: "U + U' = n_1 \\cdot n_2",
      },
    ],
  },
  {
    category: "Chi-Square",
    formulas: [
      {
        label: "Chi-square (χ²)",
        latex: "\\chi^2 = \\sum \\dfrac{(O - E)^2}{E}",
        hint: "O = observed, E = expected frequency",
      },
      {
        label: "Expected frequency",
        latex: "E = \\dfrac{(\\text{Row Total}) \\times (\\text{Column Total})}{\\text{Grand Total}}",
      },
    ],
  },
];

/**
 * Symbol palette grouped for the dialog.
 * `insert` is the LaTeX snippet inserted at the cursor.
 * `caretOffset` (optional) tells the editor where to place the caret —
 * the index from the start of `insert` where the user should start typing.
 * If omitted, the caret is placed at the end of the inserted snippet.
 */
export interface PaletteSymbol {
  label: string;
  insert: string;
  caretOffset?: number;
  /** Optional tooltip text. */
  title?: string;
}

export interface PaletteGroup {
  group: string;
  symbols: PaletteSymbol[];
}

export const SYMBOL_PALETTE: PaletteGroup[] = [
  {
    group: "Structure",
    symbols: [
      { label: "a⁄b", insert: "\\dfrac{}{}", caretOffset: 7, title: "Fraction" },
      { label: "√", insert: "\\sqrt{}", caretOffset: 6, title: "Square root" },
      { label: "ⁿ√", insert: "\\sqrt[]{}", caretOffset: 6, title: "Nth root" },
      { label: "x²", insert: "^{}", caretOffset: 2, title: "Superscript" },
      { label: "xₙ", insert: "_{}", caretOffset: 2, title: "Subscript" },
      { label: "( )", insert: "\\left(\\right)", caretOffset: 6, title: "Auto-sized parens" },
      { label: "[ ]", insert: "\\left[\\right]", caretOffset: 6, title: "Auto-sized brackets" },
      { label: "x̄", insert: "\\bar{}", caretOffset: 5, title: "Bar (mean)" },
      { label: "x̂", insert: "\\hat{}", caretOffset: 5, title: "Hat" },
      { label: "Σ_a^b", insert: "\\sum_{}^{}", caretOffset: 6, title: "Sum with limits" },
      { label: "∫_a^b", insert: "\\int_{}^{}", caretOffset: 6, title: "Integral with limits" },
    ],
  },
  {
    group: "Operators",
    symbols: [
      { label: "Σ", insert: "\\sum " },
      { label: "∏", insert: "\\prod " },
      { label: "∫", insert: "\\int " },
      { label: "±", insert: "\\pm " },
      { label: "×", insert: "\\times " },
      { label: "÷", insert: "\\div " },
      { label: "·", insert: "\\cdot " },
      { label: "≤", insert: "\\leq " },
      { label: "≥", insert: "\\geq " },
      { label: "≠", insert: "\\neq " },
      { label: "≈", insert: "\\approx " },
      { label: "∞", insert: "\\infty " },
      { label: "→", insert: "\\to " },
      { label: "∈", insert: "\\in " },
    ],
  },
  {
    group: "Greek",
    symbols: [
      { label: "α", insert: "\\alpha " },
      { label: "β", insert: "\\beta " },
      { label: "γ", insert: "\\gamma " },
      { label: "Δ", insert: "\\Delta " },
      { label: "θ", insert: "\\theta " },
      { label: "λ", insert: "\\lambda " },
      { label: "μ", insert: "\\mu " },
      { label: "π", insert: "\\pi " },
      { label: "ρ", insert: "\\rho " },
      { label: "σ", insert: "\\sigma " },
      { label: "Σ", insert: "\\Sigma " },
      { label: "τ", insert: "\\tau " },
      { label: "φ", insert: "\\phi " },
      { label: "χ", insert: "\\chi " },
      { label: "ω", insert: "\\omega " },
    ],
  },
];
