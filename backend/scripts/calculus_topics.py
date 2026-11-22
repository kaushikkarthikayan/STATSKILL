"""Engineering Mathematics: Calculus. Original notes and sample questions written for this project."""

COURSE = {
    "name": "Engineering Mathematics: Calculus",
    "description": "First-year engineering calculus: limits, derivatives, integrals, partial derivatives, series and differential equations, with links to machine learning.",
    "level": "intermediate",
    "duration_weeks": 8,
    "required_skills": ["Limits", "Differentiation", "Integration", "Multivariable calculus", "Series", "Differential equations"],
}

TOPICS = [
    {
        "name": "Limits and Continuity",
        "skill": "Limits",
        "description": "What a function approaches, and when it has no jumps or breaks.",
        "objectives": ["Evaluate simple limits", "Know standard limits", "Test continuity"],
        "note": (
            "The limit of f(x) as x approaches a is the value f(x) gets close to when x gets close to a (it does not need to equal f(a)).\n\n"
            "Useful limits: lim x->0 of sin x / x = 1; lim x->0 of (e^x - 1)/x = 1; lim x->infinity of 1/x = 0.\n"
            "For a 0/0 form, factor and cancel: (x^2 - 4)/(x - 2) = x + 2 for x not equal to 2, so the limit at 2 is 4.\n\n"
            "A function is continuous at a if f(a) exists, the limit as x approaches a exists, and the two are equal. A continuous function has no gaps, jumps or holes at that point."
        ),
        "points": [
            ("lim x->0 of sin x / x = 1.", True),
            ("For 0/0, try factoring and cancelling.", True),
            ("Continuity at a needs the limit to exist and equal f(a).", True),
        ],
        "questions": [
            ("lim (x->0) sin x / x equals:", ["0", "1", "infinity", "does not exist"], 1, "This is a standard limit equal to 1.", "easy"),
            ("lim (x->2) (x^2 - 4)/(x - 2) equals:", ["0", "2", "4", "undefined"], 2, "Cancel (x - 2) to get x + 2, which is 4 at x = 2.", "easy"),
            ("lim (x->infinity) 1/x equals:", ["0", "1", "infinity", "-1"], 0, "As x grows, 1/x shrinks to 0.", "easy"),
            ("f is continuous at a when:", ["lim f(x) as x->a equals f(a)", "f(a) is zero", "f is increasing", "the graph is a line"], 0, "The limit must exist and match the value.", "medium"),
            ("lim (x->0) (e^x - 1)/x equals:", ["0", "1", "e", "infinity"], 1, "It is the derivative of e^x at 0, which is 1.", "medium"),
        ],
    },
    {
        "name": "Differentiation Rules",
        "skill": "Differentiation",
        "description": "The derivative as a rate of change, and the rules for finding it.",
        "objectives": ["Use power, product, quotient and chain rules", "Know standard derivatives"],
        "note": (
            "The derivative f'(x) is the instantaneous rate of change of f, or the slope of its tangent.\n\n"
            "Power rule: d/dx x^n = n x^(n-1). Standard results: d/dx sin x = cos x; d/dx cos x = -sin x; d/dx e^x = e^x; d/dx ln x = 1/x.\n"
            "Product rule: (uv)' = u'v + uv'. Quotient rule: (u/v)' = (u'v - uv')/v^2. Chain rule: d/dx f(g(x)) = f'(g(x)) g'(x).\n\n"
            "Example: d/dx sin(3x) = 3 cos(3x). d/dx (x^2 e^x) = 2x e^x + x^2 e^x = e^x (x^2 + 2x)."
        ),
        "points": [
            ("Power rule: d/dx x^n = n x^(n-1).", True),
            ("Product rule: (uv)' = u'v + uv'.", True),
            ("Chain rule: differentiate the outside, then multiply by the derivative of the inside.", True),
        ],
        "questions": [
            ("d/dx of x^5 is:", ["5x^4", "x^4", "5x^5", "4x^5"], 0, "Power rule: bring down 5 and subtract 1 from the power.", "easy"),
            ("d/dx of sin x is:", ["cos x", "-cos x", "-sin x", "tan x"], 0, "A standard derivative.", "easy"),
            ("d/dx of ln x is:", ["1/x", "x", "e^x", "ln x / x"], 0, "A standard derivative.", "easy"),
            ("d/dx of sin(3x) is:", ["cos(3x)", "3 cos(3x)", "-3 cos(3x)", "3 sin(3x)"], 1, "Chain rule: cos(3x) times 3.", "medium"),
            ("d/dx of x^2 e^x is:", ["2x e^x", "e^x (x^2 + 2x)", "x^2 e^x", "2x + e^x"], 1, "Product rule: 2x e^x + x^2 e^x.", "medium"),
        ],
    },
    {
        "name": "Applications of Derivatives",
        "skill": "Differentiation",
        "description": "Rates of change, maxima and minima, and optimisation.",
        "objectives": ["Find critical points", "Use the second-derivative test", "Solve rate problems"],
        "note": (
            "Critical points of f are where f'(x) = 0 or f' does not exist. They are the candidates for maxima and minima.\n\n"
            "Second-derivative test: if f'(c) = 0 and f''(c) > 0, f has a local minimum at c; if f''(c) < 0, a local maximum.\n\n"
            "Example: f(x) = x^2 - 4x + 3. f'(x) = 2x - 4 = 0 gives x = 2, and f''(x) = 2 > 0, so x = 2 is a minimum (value -1).\n\n"
            "Rates: if s(t) is position, velocity is s'(t) and acceleration is s''(t). For a circle of radius r, area A = pi r^2 so dA/dr = 2 pi r."
        ),
        "points": [
            ("Critical points: f' = 0 or f' undefined.", True),
            ("f'' > 0 at a critical point means a local minimum; f'' < 0 means a local maximum.", True),
            ("Velocity is the derivative of position.", False),
        ],
        "questions": [
            ("f(x) = x^2 - 4x + 3 has its minimum at x =", ["1", "2", "3", "4"], 1, "f'(x) = 2x - 4 = 0 gives x = 2.", "easy"),
            ("If f'(c) = 0 and f''(c) < 0, then at c there is a:", ["Local maximum", "Local minimum", "Inflection only", "Discontinuity"], 0, "Negative second derivative means the curve bends down.", "medium"),
            ("If s = t^3, the velocity at t = 2 is:", ["8", "12", "6", "3"], 1, "v = 3t^2 = 12 at t = 2.", "medium"),
            ("The rate of change of a circle's area with radius, dA/dr, is:", ["pi r", "2 pi r", "pi r^2", "r^2"], 1, "A = pi r^2, so dA/dr = 2 pi r.", "medium"),
            ("Critical points occur where f' is:", ["Zero or undefined", "Always positive", "Equal to f", "Infinite only"], 0, "Those are the candidates for extremes.", "easy"),
        ],
    },
    {
        "name": "Integration Techniques",
        "skill": "Integration",
        "description": "Antiderivatives, substitution and integration by parts.",
        "objectives": ["Integrate standard functions", "Use substitution", "Use integration by parts"],
        "note": (
            "Integration reverses differentiation. Standard results (add + C): integral of x^n dx = x^(n+1)/(n+1) for n not equal to -1; "
            "integral of 1/x dx = ln|x|; integral of cos x dx = sin x; integral of e^x dx = e^x.\n\n"
            "Substitution: let u = g(x) to simplify. Integral of 2x e^(x^2) dx: put u = x^2, du = 2x dx, giving e^u = e^(x^2) + C.\n\n"
            "By parts: integral of u dv = uv - integral of v du. Integral of x e^x dx: take u = x, dv = e^x dx, giving x e^x - e^x + C."
        ),
        "points": [
            ("Integral of x^n dx = x^(n+1)/(n+1) + C for n not equal to -1.", True),
            ("Substitution: choose u so that du appears in the integrand.", True),
            ("By parts: integral of u dv = uv - integral of v du.", True),
        ],
        "questions": [
            ("Integral of cos x dx is:", ["sin x + C", "-sin x + C", "cos x + C", "tan x + C"], 0, "The derivative of sin x is cos x.", "easy"),
            ("Integral of 1/x dx is:", ["ln|x| + C", "1/x^2 + C", "x + C", "e^x + C"], 0, "A standard integral.", "easy"),
            ("Integral of x^3 dx is:", ["x^4/4 + C", "3x^2 + C", "x^4 + C", "x^3/3 + C"], 0, "Add 1 to the power and divide by it.", "easy"),
            ("Integral of 2x e^(x^2) dx is:", ["e^(x^2) + C", "2 e^(x^2) + C", "x^2 e^x + C", "e^x + C"], 0, "Substitute u = x^2.", "medium"),
            ("Integral of x e^x dx is:", ["x e^x - e^x + C", "x e^x + e^x + C", "e^x + C", "x^2 e^x / 2 + C"], 0, "Integration by parts with u = x.", "hard"),
        ],
    },
    {
        "name": "Definite Integrals and Area",
        "skill": "Integration",
        "description": "The Fundamental Theorem of Calculus and areas under curves.",
        "objectives": ["Evaluate definite integrals", "Find areas", "Use symmetry"],
        "note": (
            "The Fundamental Theorem of Calculus: if F' = f then the integral of f from a to b equals F(b) - F(a).\n\n"
            "Examples: integral of x from 0 to 2 = [x^2/2] = 2. Integral of sin x from 0 to pi = [-cos x] = 2. Area under y = x^2 from 0 to 3 = [x^3/3] = 9.\n\n"
            "Symmetry: for an odd function (f(-x) = -f(x)), the integral from -a to a is 0. For an even function it is twice the integral from 0 to a. "
            "Area counts as positive; where the curve is below the axis the integral is negative."
        ),
        "points": [
            ("Integral from a to b of f = F(b) - F(a).", True),
            ("Odd functions integrate to zero over symmetric limits.", True),
            ("Integral gives signed area; below the axis it is negative.", False),
        ],
        "questions": [
            ("Integral of x dx from 0 to 2 is:", ["1", "2", "4", "0.5"], 1, "[x^2/2] from 0 to 2 = 2.", "easy"),
            ("Integral of sin x dx from 0 to pi is:", ["0", "1", "2", "pi"], 2, "[-cos x] = 1 + 1 = 2.", "medium"),
            ("The area under y = x^2 from 0 to 3 is:", ["3", "6", "9", "27"], 2, "[x^3/3] from 0 to 3 = 9.", "medium"),
            ("Integral of x^3 dx from -1 to 1 is:", ["0", "1", "2", "0.5"], 0, "x^3 is odd, so the areas cancel.", "medium"),
            ("The Fundamental Theorem links:", ["Derivatives and integrals", "Limits and series only", "Sine and cosine", "Matrices and vectors"], 0, "It shows integration undoes differentiation.", "easy"),
        ],
    },
    {
        "name": "Partial Derivatives and Gradients",
        "skill": "Multivariable calculus",
        "description": "Calculus with several variables, the gradient and its role in machine learning.",
        "objectives": ["Compute partial derivatives", "Form the gradient", "Explain gradient descent"],
        "note": (
            "For f(x, y), the partial derivative with respect to x treats y as a constant. If f = x^2 y then df/dx = 2xy and df/dy = x^2.\n\n"
            "The gradient is the vector of all partial derivatives: grad f = (df/dx, df/dy). For f = x^2 + y^2 at (1, 2) the gradient is (2, 4).\n\n"
            "The gradient points in the direction of steepest increase, and its length is the steepness. Gradient descent for machine learning moves the weights in the "
            "opposite direction, w = w - (learning rate) x grad L, to reduce the loss L."
        ),
        "points": [
            ("A partial derivative holds the other variables constant.", True),
            ("The gradient points toward the steepest increase.", True),
            ("Gradient descent moves against the gradient of the loss.", True),
        ],
        "questions": [
            ("If f = x^2 y, then df/dx is:", ["2xy", "x^2", "2x", "y"], 0, "Treat y as a constant.", "easy"),
            ("If f = x^2 y^3, then df/dy is:", ["3x^2 y^2", "2x y^3", "x^2 y^2", "6xy"], 0, "Differentiate y^3 and keep x^2.", "medium"),
            ("For f = x^2 + y^2, the gradient at (1, 2) is:", ["(2, 4)", "(1, 2)", "(4, 2)", "(5, 5)"], 0, "(2x, 2y) at (1, 2).", "medium"),
            ("The gradient of a function points:", ["Toward steepest increase", "Toward steepest decrease", "Along the x-axis", "To the origin"], 0, "It shows the direction of fastest growth.", "medium"),
            ("Gradient descent updates weights by moving:", ["Opposite the gradient", "Along the gradient", "Randomly", "Toward the largest weight"], 0, "That reduces the loss.", "easy"),
        ],
    },
    {
        "name": "Sequences and Series",
        "skill": "Series",
        "description": "Sums of infinite terms, convergence tests and Taylor series.",
        "objectives": ["Sum a geometric series", "Use the ratio test", "Write a Taylor series"],
        "note": (
            "A geometric series a + ar + ar^2 + ... converges when |r| < 1 and its sum is a / (1 - r). So 1 + 1/2 + 1/4 + ... = 2.\n\n"
            "The harmonic series 1 + 1/2 + 1/3 + ... diverges even though its terms shrink.\n\n"
            "Ratio test: for terms a_n, find the limit L of |a(n+1)/a_n|. If L < 1 the series converges; if L > 1 it diverges; if L = 1 the test fails.\n\n"
            "A Taylor series writes a function as a sum of powers. About 0 (a Maclaurin series): e^x = 1 + x + x^2/2! + x^3/3! + ... "
            "Computers use such series to approximate functions."
        ),
        "points": [
            ("Geometric series sum = a / (1 - r) when |r| < 1.", True),
            ("The harmonic series diverges.", True),
            ("Maclaurin series of e^x = 1 + x + x^2/2! + x^3/3! + ...", False),
        ],
        "questions": [
            ("1 + 1/2 + 1/4 + 1/8 + ... equals:", ["1", "2", "infinity", "1.5"], 1, "a = 1, r = 1/2, sum = 1/(1 - 1/2) = 2.", "easy"),
            ("The harmonic series 1 + 1/2 + 1/3 + ...", ["Converges to 2", "Converges to 1", "Diverges", "Equals e"], 2, "Its partial sums grow without bound.", "medium"),
            ("By the ratio test, a series converges if the limit L is:", ["Less than 1", "Greater than 1", "Exactly 1 always", "Negative"], 0, "L < 1 means convergence.", "medium"),
            ("The Maclaurin series of e^x begins:", ["1 + x + x^2/2! + ...", "x + x^3/3! + ...", "1 - x + x^2 - ...", "1 + 2x + 3x^2 + ..."], 0, "All terms are x^n / n!.", "medium"),
            ("A Maclaurin series is a Taylor series about:", ["0", "1", "pi", "infinity"], 0, "It is centred at x = 0.", "easy"),
        ],
    },
    {
        "name": "Differential Equations",
        "skill": "Differential equations",
        "description": "Equations with derivatives: order, separable and first-order linear equations.",
        "objectives": ["State the order of an equation", "Solve separable equations", "Use an integrating factor"],
        "note": (
            "A differential equation relates a function to its derivatives. Its order is the highest derivative present: d^2y/dx^2 + y = 0 is second order.\n\n"
            "Separable equations: dy/dx = f(x) g(y) can be rearranged to (1/g) dy = f dx and each side integrated. "
            "For dy/dx = y: dy/y = dx gives ln|y| = x + c, so y = C e^x. For dy/dx = xy the solution is y = C e^(x^2/2).\n\n"
            "An initial condition fixes C. For dy/dx = 2x with y(0) = 1, y = x^2 + 1.\n\n"
            "First-order linear: dy/dx + P(x) y = Q(x). Multiply by the integrating factor e^(integral of P dx), then integrate."
        ),
        "points": [
            ("Order = the highest derivative in the equation.", True),
            ("Separable equations are solved by separating variables and integrating.", True),
            ("Linear first order uses the integrating factor e^(integral of P dx).", True),
        ],
        "questions": [
            ("The order of d^2y/dx^2 + y = 0 is:", ["1", "2", "3", "0"], 1, "The highest derivative is the second.", "easy"),
            ("The general solution of dy/dx = y is:", ["y = C e^x", "y = x + C", "y = C x", "y = ln x"], 0, "Separating gives ln|y| = x + c.", "medium"),
            ("The solution of dy/dx = 2x with y(0) = 1 is:", ["y = x^2 + 1", "y = 2x + 1", "y = x^2", "y = x + 1"], 0, "Integrate to x^2 + C, and y(0) = 1 gives C = 1.", "medium"),
            ("The solution of dy/dx = x y is:", ["y = C e^(x^2/2)", "y = C e^x", "y = C x^2", "y = x^2 y"], 0, "Separate: dy/y = x dx.", "hard"),
            ("The integrating factor for dy/dx + P(x) y = Q(x) is:", ["e^(integral of P dx)", "P(x)", "e^(Q)", "1/P"], 0, "It makes the left side a derivative of a product.", "hard"),
        ],
    },
]
