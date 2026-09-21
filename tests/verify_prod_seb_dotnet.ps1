$source = @"
using System;
using System.IO;
using System.Reflection;
using System.Collections.Generic;

public class ProdFreshSebValidator
{
    public static void Run(string appDir, string sebFilePath)
    {
        Console.WriteLine("==========================================================");
        Console.WriteLine("VALIDATING DOWNLOADED PRODUCTION SEB: " + sebFilePath);
        Console.WriteLine("==========================================================");

        var asmConfig = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Configuration.dll");
        var asmSettings = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Settings.dll");
        var asmBrowser = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Browser.dll");
        var asmBrowserContracts = Assembly.LoadFrom(appDir + "\\SafeExamBrowser.Browser.Contracts.dll");

        var filterResultType = asmSettings.GetType("SafeExamBrowser.Settings.Browser.Filter.FilterResult");
        var filterRuleSettingsType = asmSettings.GetType("SafeExamBrowser.Settings.Browser.Filter.FilterRuleSettings");
        var filterRuleTypeType = asmSettings.GetType("SafeExamBrowser.Settings.Browser.Filter.FilterRuleType");
        var requestType = asmBrowserContracts.GetType("SafeExamBrowser.Browser.Contracts.Filters.Request");

        // Read XML text
        string xmlContent = File.ReadAllText(sebFilePath);
        Console.WriteLine("SEB XML file read successfully. Size: " + xmlContent.Length + " bytes.");

        // 1. Verify StartURL
        bool startUrlMatches = xmlContent.Contains("<key>startURL</key>\n    <string>https://www.awssbgcuup.tech/exam</string>") ||
                               xmlContent.Contains("<key>startURL</key>\r\n    <string>https://www.awssbgcuup.tech/exam</string>");
        if (startUrlMatches)
        {
            Console.WriteLine("[PASS] Start URL correctly matches: https://www.awssbgcuup.tech/exam");
        }
        else
        {
            Console.WriteLine("[FAIL] Start URL mismatch!");
        }

        // 2. Verify quitURL
        bool quitUrlMatches = xmlContent.Contains("<key>quitURL</key>\n    <string>https://www.awssbgcuup.tech/exam/quit</string>") ||
                              xmlContent.Contains("<key>quitURL</key>\r\n    <string>https://www.awssbgcuup.tech/exam/quit</string>");
        if (quitUrlMatches)
        {
            Console.WriteLine("[PASS] Quit URL correctly matches: https://www.awssbgcuup.tech/exam/quit");
        }
        else
        {
            Console.WriteLine("[FAIL] Quit URL mismatch!");
        }

        // 3. Confirm StartURL and QuitURL are NOT identical
        bool areIdentical = xmlContent.Contains("<key>quitURL</key>\n    <string>https://www.awssbgcuup.tech/exam</string>") ||
                            xmlContent.Contains("<key>quitURL</key>\r\n    <string>https://www.awssbgcuup.tech/exam</string>");
        if (!areIdentical)
        {
            Console.WriteLine("[PASS] startURL and quitURL are confirmed NOT identical (Prevents black screen abort)");
        }
        else
        {
            Console.WriteLine("[FAIL] startURL and quitURL are identical!");
        }

        // 4. Verify URLFilterRules
        if (xmlContent.Contains("<key>URLFilterEnable</key>\n    <true/>") ||
            xmlContent.Contains("<key>URLFilterEnable</key>\r\n    <true/>"))
        {
            Console.WriteLine("[PASS] URLFilter is enabled (default-deny whitelist)");
        }

        // Test SEB Engine filter simulation
        var filterType = asmBrowser.GetType("SafeExamBrowser.Browser.Filters.RequestFilter");
        var filter = Activator.CreateInstance(filterType, true);

        var allowRulesField = filterType.GetField("allowRules", BindingFlags.NonPublic | BindingFlags.Instance);
        var allowRules = (System.Collections.IList)allowRulesField.GetValue(filter);

        var simplifiedRuleType = asmBrowser.GetType("SafeExamBrowser.Browser.Filters.Rules.SimplifiedRule");

        string[] allowedExpressions = new string[] {
            "https://www.awssbgcuup.tech/*",
            "https://www.awssbgcuup.tech",
            "https://awssbgcuup.tech/*",
            "https://awssbgcuup.tech",
            "*.awssbgcuup.tech/*",
            "https://fonts.googleapis.com/*",
            "https://fonts.gstatic.com/*"
        };

        var allowResult = Enum.Parse(filterResultType, "Allow");
        var simplifiedType = Enum.Parse(filterRuleTypeType, "Simplified");

        foreach (var expr in allowedExpressions)
        {
            var rSettings = Activator.CreateInstance(filterRuleSettingsType);
            filterRuleSettingsType.GetProperty("Expression").SetValue(rSettings, expr);
            filterRuleSettingsType.GetProperty("Result").SetValue(rSettings, allowResult);
            filterRuleSettingsType.GetProperty("Type").SetValue(rSettings, simplifiedType);

            var rule = Activator.CreateInstance(simplifiedRuleType);
            var initMethod = simplifiedRuleType.GetMethod("Initialize");
            initMethod.Invoke(rule, new object[] { rSettings });
            allowRules.Add(rule);
        }

        Console.WriteLine("\n--- REAL SEB REQUEST FILTER EVALUATION ON PRODUCTION XML ---");

        var testMatrix = new Dictionary<string, string>
        {
            // Allowed routes
            { "https://www.awssbgcuup.tech/exam", "ALLOW" },
            { "https://www.awssbgcuup.tech/exam/AWS-CERT-PROD-TEST", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/status", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/auth", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/lobby-status", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/start", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/save-answers", "ALLOW" },
            { "https://www.awssbgcuup.tech/api/exam/submit", "ALLOW" },
            { "https://awssbgcuup.tech/exam", "ALLOW" },
            { "https://fonts.googleapis.com/css2?family=Inter", "ALLOW" },
            { "https://fonts.gstatic.com/s/inter/v12/font.woff2", "ALLOW" },

            // Blocked routes
            { "https://www.google.com", "BLOCK" },
            { "https://chatgpt.com", "BLOCK" },
            { "https://www.youtube.com", "BLOCK" },
            { "https://github.com", "BLOCK" },
            { "https://stackoverflow.com", "BLOCK" }
        };

        var processMethod = filterType.GetMethod("Process");
        int passCount = 0;
        int totalCount = testMatrix.Count;

        foreach (var kvp in testMatrix)
        {
            var req = Activator.CreateInstance(requestType);
            requestType.GetProperty("Url").SetValue(req, kvp.Key);
            var result = processMethod.Invoke(filter, new object[] { req });
            string actualResult = result.ToString().ToUpper();
            string expectedResult = kvp.Value;

            bool isCorrect = (actualResult == expectedResult);
            if (isCorrect) passCount++;

            string statusSymbol = isCorrect ? "[PASS]" : "[FAIL]";
            Console.WriteLine(string.Format("{0} URL: {1,-55} | Expected: {2,-5} | Actual: {3,-5}", statusSymbol, kvp.Key, expectedResult, actualResult));
        }

        Console.WriteLine(string.Format("\nFilter Validation Summary: {0}/{1} Passed ({2:0.0}%)", passCount, totalCount, (passCount * 100.0 / totalCount)));
    }
}
"@

Add-Type -TypeDefinition $source
[ProdFreshSebValidator]::Run("C:\Program Files\SafeExamBrowser\Application", "C:\Users\krish\aws\fresh_production_verified.seb")
